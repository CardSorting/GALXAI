import AppKit

// Native launcher only: no HTTP listener, account data, keys or shared monitor session.
final class MonitorApp: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private var item: NSStatusItem!
    private let menu = NSMenu()
    private let worker = DispatchQueue(label: "ai.galx.monitors.launch")
    private var pending = Set<String>()
    private var states = ["premium": "Checking…"]
    private var opening: String?
    private var window: NSWindow?
    private var progressText: NSTextField?
    private var refreshTimer: Timer?
    private var trackingMenu = false
    private var shortcut: String? { Bundle.main.object(forInfoDictionaryKey: "GALXPool") as? String }
    private var root: String { Bundle.main.object(forInfoDictionaryKey: "GALXWorkspace") as? String ?? "" }
    private func name(_ pool: String) -> String { pool == "premium" ? "Premium" : "Relay" }

    func applicationDidFinishLaunching(_ notification: Notification) {
        if let pool = shortcut {
            guard pool == "premium", let url = URL(string: "galx-monitor://open/\(pool)") else { NSApp.terminate(nil); return }
            NSWorkspace.shared.open(url)
            NSApp.terminate(nil)
            return
        }
        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.image = NSImage(systemSymbolName: "rectangle.stack", accessibilityDescription: "GALX Monitors")
        item.button?.image?.isTemplate = true
        item.button?.title = " GALX"
        item.button?.toolTip = "Open Premium"
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
    func menuWillOpen(_ menu: NSMenu) { trackingMenu = true; refresh() }
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
        }
        menu.addItem(.separator())
        add("Open at Login", action: #selector(toggleLogin)).state = FileManager.default.fileExists(atPath: loginPath) ? .on : .off
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
            process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
            process.arguments = ["node", "scripts/relay-local.mjs", "open", pool]
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
                    let alert = NSAlert(); alert.messageText = "Couldn’t open \(self.name(pool))"
                    alert.informativeText = "Check your internet connection and that Docker Desktop can start, then try again. Your saved accounts have not changed. If this continues, use Help in the GALX menu."
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
        for (pool, port) in [("premium", 13311)] {
            var request = URLRequest(url: URL(string: "http://127.0.0.1:\(port)/health/live")!); request.timeoutInterval = 2
            URLSession.shared.dataTask(with: request) { data, response, error in
                let ok = error == nil && (response as? HTTPURLResponse)?.statusCode == 200 && (try? JSONSerialization.jsonObject(with: data ?? Data()) as? [String: Bool])?["ok"] == true
                DispatchQueue.main.async { self.states[pool] = ok ? "Monitor available" : "Starts when opened"; if self.pending.isEmpty && !self.trackingMenu { self.rebuildMenu() } }
            }.resume()
        }
    }
    private var loginPath: String { NSHomeDirectory() + "/Library/LaunchAgents/ai.galx.monitors.plist" }
    @objc private func toggleLogin() {
        do {
            if FileManager.default.fileExists(atPath: loginPath) { try FileManager.default.removeItem(atPath: loginPath) }
            else {
                try FileManager.default.createDirectory(atPath: (loginPath as NSString).deletingLastPathComponent, withIntermediateDirectories: true)
                let plist: [String: Any] = ["Label": "ai.galx.monitors", "ProgramArguments": [Bundle.main.executablePath!, "--background"], "RunAtLoad": true]
                try PropertyListSerialization.data(fromPropertyList: plist, format: .xml, options: 0).write(to: URL(fileURLWithPath: loginPath), options: .atomic)
            }
            rebuildMenu()
        } catch { let alert = NSAlert(); alert.messageText = "Login preference could not be saved"; alert.informativeText = "You can still open GALX Monitors from Applications."; alert.runModal() }
    }
    @objc private func showShortcuts() { NSWorkspace.shared.selectFile(Bundle.main.bundlePath, inFileViewerRootedAtPath: NSHomeDirectory() + "/Applications") }
    @objc private func help() {
        let alert = NSAlert(); alert.messageText = "Open Premium in one step"
        alert.informativeText = "Choose Premium in the GALX menu or search for GALX Premium in Spotlight. Stopped services start when opened.\n\nQuitting this menu app leaves your services running."
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
