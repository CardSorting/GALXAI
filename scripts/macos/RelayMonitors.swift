import AppKit
import Darwin

// Native launcher only: no HTTP listener, account data, keys or shared monitor session.
final class MonitorApp: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var item: NSStatusItem!
    private let menu = NSMenu()
    private let worker = DispatchQueue(label: "ai.galx.monitors.launch")
    private var pending = Set<String>()
    private var states = ["premium": "Checking…"]
    private var monitorHealthy = false
    private var relayHealthy = false
    private var supervisorState = "stopped"
    private var supervisorAttempt = 0
    private var supervisorRetryAt: Date?
    private var supervisorCause: String?
    private var powerSummary = ""
    private var opening: String?
    private var window: NSWindow?
    private var progressText: NSTextField?
    private var refreshTimer: Timer?
    private var trackingMenu = false
    private var shortcut: String? { Bundle.main.object(forInfoDictionaryKey: "GALXPool") as? String }
    private var root: String { Bundle.main.object(forInfoDictionaryKey: "GALXWorkspace") as? String ?? "" }
    private var nodeExecutable: String { Bundle.main.object(forInfoDictionaryKey: "GALXNodeExecutable") as? String ?? "/opt/homebrew/bin/node" }
    private let keepOnlineLabel = "ai.galx.relay-local"
    private var keepOnlinePath: String { NSHomeDirectory() + "/Library/LaunchAgents/ai.galx.relay-local.plist" }
    private var supervisorStatePath: String { root + "/.relay/service-deployment/supervisor-state.json" }
    private func name(_ pool: String) -> String { pool == "premium" ? "Premium" : "Relay" }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if let pool = shortcut {
            guard pool == "premium", let url = URL(string: "galx-monitor://open/\(pool)") else { NSApp.terminate(nil); return }
            NSWorkspace.shared.open(url)
            NSApp.terminate(nil)
            return
        }
        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = " GALX"
        updateStatusIcon()
        menu.delegate = self
        menu.autoenablesItems = false
        item.menu = menu
        rebuildMenu()
        refresh()
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak self] _ in self?.refresh() }
        if pending.isEmpty && !CommandLine.arguments.contains("--background") { DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { if self.pending.isEmpty { self.item.button?.performClick(nil) } } }
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            // Deep links accept exactly two destinations, never URLs, commands or credentials.
            guard url.scheme == "galx-monitor", url.host == "open", url.user == nil, url.password == nil,
                  url.port == nil, url.query == nil, url.fragment == nil,
                  url.path == "/premium" else { continue }
            launch(String(url.path.dropFirst()))
        }
    }
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if let pool = shortcut { NSWorkspace.shared.open(URL(string: "galx-monitor://open/\(pool)")!) }
        else { item?.button?.performClick(nil) }
        return true
    }
    func menuWillOpen(_ menu: NSMenu) { trackingMenu = true; readSupervisorState(); rebuildMenu(); refresh() }
    func menuDidClose(_ menu: NSMenu) { trackingMenu = false; rebuildMenu() }
    @discardableResult private func add(_ title: String, action: Selector?, key: String = "", pool: String? = nil) -> NSMenuItem {
        let row = NSMenuItem(title: title, action: action, keyEquivalent: key)
        row.target = self; row.representedObject = pool; row.isEnabled = action != nil
        menu.addItem(row); return row
    }
    private func rebuildMenu() {
        guard item != nil else { return }
        menu.removeAllItems()
        add("GALX Monitors", action: nil)
        for (pool, key) in [("premium", "1")] {
            menu.addItem(.separator())
            let busy = pending.contains(pool)
            let row = add(busy ? "Opening \(name(pool))…" : "Open \(name(pool))", action: #selector(openMonitor(_:)), key: key, pool: pool)
            row.isEnabled = !busy
            row.image = NSImage(systemSymbolName: pool == "premium" ? "p.square" : "s.square", accessibilityDescription: nil)
            let status = add(busy ? "Starting and connecting…" : states[pool]!, action: nil); status.indentationLevel = 1
            let supervisor = add(supervisorSummary(), action: nil); supervisor.indentationLevel = 1
            if !powerSummary.isEmpty {
                let power = add("Power · \(powerSummary)", action: nil); power.indentationLevel = 1
            }
        }
        menu.addItem(.separator())
        let keepOnline = add("Keep Premium online", action: #selector(toggleKeepOnline))
        keepOnline.state = keepOnlineInstalled() ? .on : .off
        keepOnline.isEnabled = pending.isEmpty
        let keepHint = add("Restarts local services after sign-in", action: nil); keepHint.indentationLevel = 1
        let loginTitle = loginPreferenceConflicts() ? "Open at Login · Review Settings" : "Open at Login"
        add(loginTitle, action: #selector(toggleLogin)).state = loginPreferenceEnabled() ? .on : .off
        add("Show App Shortcuts", action: #selector(showShortcuts))
        add("Help", action: #selector(help))
        menu.addItem(.separator())
        add("Quit GALX Monitors", action: #selector(quit), key: "q").isEnabled = pending.isEmpty
    }
    @objc private func openMonitor(_ sender: NSMenuItem) { if let pool = sender.representedObject as? String { launch(pool) } }
    private func launch(_ pool: String) {
        guard pool == "premium", !pending.contains(pool) else { return }
        pending.insert(pool); rebuildMenu()
        worker.async {
            DispatchQueue.main.async { self.opening = pool; self.showProgress(pool) }
            let process = Process()
            process.executableURL = URL(fileURLWithPath: self.nodeExecutable)
            process.arguments = ["scripts/relay-local.mjs", "open", pool]
            process.currentDirectoryURL = URL(fileURLWithPath: self.root)
            process.environment = ["HOME": NSHomeDirectory(), "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", "LANG": "en_US.UTF-8"]
            // Discard subprocess output: errors can include operational paths; never show keys or commands.
            process.standardOutput = FileHandle.nullDevice; process.standardError = FileHandle.nullDevice
            var success = false
            do { try process.run(); process.waitUntilExit(); success = process.terminationStatus == 0 } catch { }
            DispatchQueue.main.async {
                self.pending.remove(pool); self.opening = nil; self.window?.orderOut(nil); self.rebuildMenu(); self.refresh()
                if !success {
                    NSApp.activate(ignoringOtherApps: true)
                    let alert = NSAlert(); alert.messageText = "\(self.name(pool)) could not start"
                    alert.informativeText = "The local relay and monitor did not both respond. Check that this Mac is signed in, connect power, then choose Open Premium to retry. No inference request was sent."
                    alert.addButton(withTitle: "Try Again"); alert.addButton(withTitle: "Cancel")
                    if alert.runModal() == .alertFirstButtonReturn { self.launch(pool) }
                }
            }
        }
    }
    private func showProgress(_ pool: String) {
        // Warm launches usually finish before a window is needed.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            guard self.opening == pool else { return }
            if self.window == nil {
                let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 420, height: 170), styleMask: [.titled], backing: .buffered, defer: false)
                window.title = "GALX Monitors"; window.isReleasedWhenClosed = false
                let heading = NSTextField(labelWithString: ""); heading.font = .systemFont(ofSize: 20, weight: .semibold)
                let hint = NSTextField(wrappingLabelWithString: "Your browser will open automatically. Starting a stopped monitor can take a minute.")
                hint.textColor = .secondaryLabelColor; hint.preferredMaxLayoutWidth = 350
                let progress = NSProgressIndicator(); progress.style = .bar; progress.isIndeterminate = true; progress.startAnimation(nil)
                let stack = NSStackView(views: [heading, hint, progress]); stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 14
                stack.translatesAutoresizingMaskIntoConstraints = false; window.contentView!.addSubview(stack)
                NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: window.contentView!.leadingAnchor, constant: 28), stack.trailingAnchor.constraint(equalTo: window.contentView!.trailingAnchor, constant: -28), stack.centerYAnchor.constraint(equalTo: window.contentView!.centerYAnchor), progress.widthAnchor.constraint(equalTo: stack.widthAnchor)])
                self.window = window; self.progressText = heading
            }
            self.progressText?.stringValue = "Opening \(self.name(pool))…"; self.window?.center(); self.window?.orderFrontRegardless()
        }
    }
    private func refresh() {
        readSupervisorState()
        for (port, isMonitor) in [(13311, true), (13301, false)] {
            var request = URLRequest(url: URL(string: "http://127.0.0.1:\(port)/health/live")!); request.timeoutInterval = 2
            URLSession.shared.dataTask(with: request) { data, response, error in
                let ok = error == nil && (response as? HTTPURLResponse)?.statusCode == 200 && (try? JSONSerialization.jsonObject(with: data ?? Data()) as? [String: Bool])?["ok"] == true
                DispatchQueue.main.async {
                    if isMonitor { self.monitorHealthy = ok } else { self.relayHealthy = ok }
                    self.updateStatusText()
                    if self.pending.isEmpty && !self.trackingMenu { self.rebuildMenu() }
                }
            }.resume()
        }
    }
    private func readSupervisorState() {
        guard keepOnlineInstalled() else {
            supervisorState = "stopped"
            supervisorAttempt = 0
            supervisorRetryAt = nil
            supervisorCause = nil
            powerSummary = ""
            return
        }
        guard let data = FileManager.default.contents(atPath: supervisorStatePath),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            supervisorState = "not-reporting"
            supervisorAttempt = 0
            supervisorRetryAt = nil
            supervisorCause = nil
            powerSummary = ""
            return
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let checkedText = object["checkedAt"] as? String, let checkedAt = formatter.date(from: checkedText),
              checkedAt.timeIntervalSinceNow <= 5, checkedAt.timeIntervalSinceNow >= -60 else {
            supervisorState = "not-reporting"
            supervisorAttempt = 0
            supervisorRetryAt = nil
            supervisorCause = nil
            powerSummary = ""
            return
        }
        let candidate = object["status"] as? String ?? "starting"
        guard ["starting", "running", "recovering", "stopped"].contains(candidate) else {
            supervisorState = "not-reporting"
            supervisorAttempt = 0
            supervisorRetryAt = nil
            supervisorCause = nil
            powerSummary = ""
            return
        }
        supervisorState = candidate
        supervisorAttempt = max(0, min(100000, object["attempt"] as? Int ?? 0))
        let cause = object["cause"] as? String
        supervisorCause = ["central", "monitor", "relay", "recovery"].contains(cause ?? "") ? cause : nil
        supervisorRetryAt = nil
        if let retryText = object["nextRetryAt"] as? String {
            supervisorRetryAt = formatter.date(from: retryText) ?? ISO8601DateFormatter().date(from: retryText)
        }
        if let power = object["power"] as? [String: Any], let source = power["source"] as? String {
            let percent = power["percent"] as? Int
            let amount = percent.map { " · \($0)%" } ?? ""
            let assertion = object["sleepAssertion"] as? String
            powerSummary = source == "ac"
                ? "AC power\(amount) · idle sleep prevention \(assertion == "active" ? "active" : "unavailable")"
                : source == "battery" ? "Battery\(amount) · sleep prevention applies on AC" : "Power status unavailable"
        } else { powerSummary = "" }
    }
    private func updateStatusText() {
        let text: String
        if supervisorState == "recovering" { text = "Recovering Premium services…" }
        else if monitorHealthy && relayHealthy { text = "Relay and monitor responding" }
        else if monitorHealthy { text = "Monitor running · relay unavailable" }
        else if relayHealthy { text = "Relay running · monitor unavailable" }
        else if keepOnlineInstalled() { text = "Starting Premium services…" }
        else { text = "Stopped · starts when opened" }
        let battery = powerSummary.hasPrefix("Battery") ? " · on battery" : ""
        states["premium"] = text + battery
        updateStatusIcon()
    }
    private func supervisorSummary() -> String {
        guard keepOnlineInstalled() else {
            return FileManager.default.fileExists(atPath: keepOnlinePath) ? "Keep online · Review Settings" : "Keep online · Off"
        }
        switch supervisorState {
        case "running": return "Keep online · Active"
        case "recovering":
            guard let retryAt = supervisorRetryAt else { return "Keep online · Recovering" }
            let seconds = max(0, Int(ceil(retryAt.timeIntervalSinceNow)))
            let attempt = supervisorAttempt > 0 ? " · attempt \(supervisorAttempt)" : ""
            let issue: String
            switch supervisorCause {
            case "central": issue = "Local services not ready · "
            case "monitor": issue = "Monitor not ready · "
            case "relay": issue = "Relay not ready · "
            case "recovery": issue = "Recovery needs attention · "
            default: issue = "Recovering · "
            }
            return seconds == 0 ? "Keep online · \(issue)retrying now\(attempt)" : "Keep online · \(issue)retry in ~\(seconds) sec\(attempt)"
        case "starting": return "Keep online · Starting"
        case "stopped": return "Keep online · Stopped"
        default: return "Keep online · Status unavailable"
        }
    }
    private func updateStatusIcon() {
        guard let button = item?.button else { return }
        let responding = monitorHealthy && relayHealthy
        let symbol = responding ? "checkmark.circle" : "circle.dashed"
        let description = "\(states["premium"] ?? "GALX Premium status"). \(supervisorSummary())."
        button.image = NSImage(systemSymbolName: symbol, accessibilityDescription: description)
        button.image?.isTemplate = true
        button.toolTip = description
    }
    private func keepOnlinePlist() -> [String: Any] {
        ["Label": keepOnlineLabel,
         "ProgramArguments": [nodeExecutable, "scripts/relay-local.mjs", "supervise"],
         "WorkingDirectory": root,
         "EnvironmentVariables": ["PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin", "LANG": "en_US.UTF-8"],
         "RunAtLoad": true,
         "KeepAlive": true,
         "ThrottleInterval": 15,
         "StandardOutPath": "/dev/null",
         "StandardErrorPath": "/dev/null"]
    }
    private func keepOnlineInstalled() -> Bool {
        guard let data = FileManager.default.contents(atPath: keepOnlinePath),
              let existing = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any],
              existing["Label"] as? String == keepOnlineLabel,
              let arguments = existing["ProgramArguments"] as? [String], arguments.count == 3,
              arguments == [nodeExecutable, "scripts/relay-local.mjs", "supervise"],
              existing["WorkingDirectory"] as? String == root,
              existing["RunAtLoad"] as? Bool == true,
              existing["KeepAlive"] as? Bool == true else { return false }
        return !root.isEmpty && nodeExecutable.hasPrefix("/")
    }
    private func runLaunchctl(_ arguments: [String]) -> Bool {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/launchctl")
        process.arguments = arguments
        process.standardOutput = FileHandle.nullDevice
        process.standardError = FileHandle.nullDevice
        do { try process.run(); process.waitUntilExit(); return process.terminationStatus == 0 } catch { return false }
    }
    @objc private func toggleKeepOnline() {
        do {
            let domain = "gui/\(getuid())"
            let fileManager = FileManager.default
            if fileManager.fileExists(atPath: keepOnlinePath) {
                guard keepOnlineInstalled() else { throw NSError(domain: "GALX", code: 1) }
                if runLaunchctl(["print", "\(domain)/\(keepOnlineLabel)"]) && !runLaunchctl(["bootout", "\(domain)/\(keepOnlineLabel)"]) { throw NSError(domain: "GALX", code: 2) }
                try fileManager.removeItem(atPath: keepOnlinePath)
            } else {
                guard !root.isEmpty, fileManager.fileExists(atPath: nodeExecutable),
                      !fileManager.fileExists(atPath: keepOnlinePath) else { throw NSError(domain: "GALX", code: 3) }
                try fileManager.createDirectory(atPath: (keepOnlinePath as NSString).deletingLastPathComponent, withIntermediateDirectories: true)
                let data = try PropertyListSerialization.data(fromPropertyList: keepOnlinePlist(), format: .xml, options: 0)
                try data.write(to: URL(fileURLWithPath: keepOnlinePath), options: .atomic)
                try fileManager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: keepOnlinePath)
                if !runLaunchctl(["bootstrap", domain, keepOnlinePath]) {
                    try? fileManager.removeItem(atPath: keepOnlinePath)
                    throw NSError(domain: "GALX", code: 4)
                }
            }
            readSupervisorState(); updateStatusText(); rebuildMenu()
        } catch {
            let alert = NSAlert(); alert.messageText = "Keep Premium online could not be changed"
            alert.informativeText = "Check that GALX Monitors was installed from this workspace and try again. The existing local service state was not removed."
            alert.addButton(withTitle: "Done"); alert.runModal()
        }
    }
    private var loginPath: String { NSHomeDirectory() + "/Library/LaunchAgents/ai.galx.monitors.plist" }
    private func loginPreferenceEnabled() -> Bool {
        guard let executable = Bundle.main.executablePath,
              let data = FileManager.default.contents(atPath: loginPath),
              let existing = try? PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else { return false }
        return existing["Label"] as? String == "ai.galx.monitors"
            && (existing["ProgramArguments"] as? [String]) == [executable, "--background"]
            && existing["RunAtLoad"] as? Bool == true
    }
    private func loginPreferenceConflicts() -> Bool {
        FileManager.default.fileExists(atPath: loginPath) && !loginPreferenceEnabled()
    }
    @objc private func toggleLogin() {
        do {
            if FileManager.default.fileExists(atPath: loginPath) {
                guard loginPreferenceEnabled() else {
                    NSApp.activate(ignoringOtherApps: true)
                    let alert = NSAlert(); alert.messageText = "Open at Login needs review"
                    alert.informativeText = "GALX found a different background item using this setting and left it unchanged. Review Login Items in System Settings before changing it."
                    alert.addButton(withTitle: "Done"); alert.runModal()
                    return
                }
                try FileManager.default.removeItem(atPath: loginPath)
            }
            else {
                try FileManager.default.createDirectory(atPath: (loginPath as NSString).deletingLastPathComponent, withIntermediateDirectories: true)
                let plist: [String: Any] = ["Label": "ai.galx.monitors", "ProgramArguments": [Bundle.main.executablePath!, "--background"], "RunAtLoad": true]
                let url = URL(fileURLWithPath: loginPath)
                try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0).write(to: url, options: .atomic)
                try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: loginPath)
            }
            rebuildMenu()
        } catch { let alert = NSAlert(); alert.messageText = "Login preference could not be saved"; alert.informativeText = "You can still open GALX Monitors from Applications."; alert.runModal() }
    }
    @objc private func showShortcuts() { NSWorkspace.shared.selectFile(Bundle.main.bundlePath, inFileViewerRootedAtPath: NSHomeDirectory() + "/Applications") }
    @objc private func help() {
        let alert = NSAlert(); alert.messageText = "Open Premium in one step"
        alert.informativeText = "Choose Open Premium in the GALX menu or search for GALX Premium in Spotlight. Keep Premium online starts the local services when this user account signs in. Open at Login only shows the menu.\n\nFor best availability, keep this Mac connected to power with the lid open. macOS can pause local services during sleep. Enabling this setting does not make the service reachable from the public internet. Quitting the menu app does not stop its separate service supervisor."
        alert.addButton(withTitle: "Done"); alert.runModal()
    }
    @objc private func quit() { NSApp.terminate(nil) }
}
let app = NSApplication.shared
if CommandLine.arguments.count == 4 && CommandLine.arguments[1] == "--icon" {
    let pool = CommandLine.arguments[3]
    let canvas = NSImage(size: NSSize(width: 1024, height: 1024))
    canvas.lockFocus()
    NSColor(calibratedRed: 7/255, green: 8/255, blue: 13/255, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: 60, y: 60, width: 904, height: 904), xRadius: 190, yRadius: 190).fill()
    let symbol = NSImage(systemSymbolName: pool == "premium" ? "p.square" : "rectangle.stack", accessibilityDescription: nil)!.withSymbolConfiguration(.init(pointSize: 420, weight: .light))!
    let tinted = NSImage(size: symbol.size); tinted.lockFocus(); symbol.draw(at: .zero, from: .zero, operation: .sourceOver, fraction: 1)
    NSColor(calibratedWhite: 0.94, alpha: 1).setFill(); NSRect(origin: .zero, size: symbol.size).fill(using: .sourceAtop); tinted.unlockFocus()
    let scale = min(560 / tinted.size.width, 560 / tinted.size.height)
    let size = NSSize(width: tinted.size.width * scale, height: tinted.size.height * scale)
    tinted.draw(in: NSRect(x: (1024-size.width)/2, y: (1024-size.height)/2, width: size.width, height: size.height))
    canvas.unlockFocus()
    let bitmap = NSBitmapImageRep(data: canvas.tiffRepresentation!)!
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
    exit(0)
}
let delegate = MonitorApp()
app.setActivationPolicy(.accessory)
app.delegate = delegate
app.run()
