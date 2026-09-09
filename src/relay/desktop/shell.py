import gi, subprocess, datetime
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk, GLib

class Desktop(Gtk.Window):
    def __init__(self):
        super().__init__(title='GALX Desktop')
        self.set_decorated(False)
        self.set_type_hint(Gdk.WindowTypeHint.DESKTOP)
        self.set_keep_below(True)
        self.set_default_size(1440, 900)
        self.move(0, 0)
        self.set_name('desktop')
        self.connect('destroy', Gtk.main_quit)
        css = Gtk.CssProvider()
        css.load_from_data(b'''
        #desktop { background: linear-gradient(145deg, #11172f 0%, #283b70 48%, #544674 100%); font-family: Inter; color: #f3f4f6; }
        #menu { background: rgba(14,18,33,.94); padding: 0 18px; min-height: 32px; }
        #menu label { color: #edf0f8; font-size: 12px; }
        #dock { background: rgba(17,23,43,.94); border: 1px solid rgba(255,255,255,.24); border-radius: 18px; padding: 9px 14px; margin: 0 0 20px; }
        #dock button { background: transparent; border: 0; box-shadow: none; padding: 8px 14px; border-radius: 12px; }
        #dock button:hover { background: rgba(255,255,255,.12); }
        #dock label { color: #edf0f8; font-size: 12px; margin-top: 4px; }
        #center-title { color: rgba(255,255,255,.9); font-size: 30px; font-weight: 600; }
        #center-help { color: rgba(255,255,255,.75); font-size: 14px; }
        ''')
        Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),css,Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        root = Gtk.Box(orientation=Gtk.Orientation.VERTICAL)
        self.add(root)
        menu=Gtk.Box(spacing=20); menu.set_name('menu')
        brand=Gtk.Label(label='GALX Desktop'); brand.set_markup('<b>GALX Desktop</b>')
        menu.pack_start(brand,False,False,0)
        menu.pack_start(Gtk.Label(label='Terminal + Chrome'),False,False,0)
        self.clock=Gtk.Label();menu.pack_end(self.clock,False,False,0)
        root.pack_start(menu,False,False,0)
        center=Gtk.Box(orientation=Gtk.Orientation.VERTICAL,spacing=12)
        center.set_valign(Gtk.Align.CENTER);center.set_halign(Gtk.Align.CENTER)
        label=Gtk.Label(label='Your workspace. Your tools.');label.set_name('center-title');center.pack_start(label,False,False,0)
        help=Gtk.Label(label='Open Terminal or Chrome from the Dock to begin.');help.set_name('center-help');center.pack_start(help,False,False,0)
        root.pack_start(center,True,True,0)
        dock=Gtk.Box(spacing=8);dock.set_name('dock');dock.set_halign(Gtk.Align.CENTER)
        for app, label, icon in [('terminal','Terminal','utilities-terminal'),('chrome','Chrome','google-chrome')]:
            b=Gtk.Button();b.set_tooltip_text('Open '+label);box=Gtk.Box(orientation=Gtk.Orientation.VERTICAL,spacing=2)
            image=Gtk.Image.new_from_icon_name(icon,Gtk.IconSize.DIALOG);image.set_pixel_size(48)
            box.pack_start(image,False,False,0);box.pack_start(Gtk.Label(label=label),False,False,0);b.add(box)
            b.connect('clicked',lambda _,app=app:subprocess.Popen(['/opt/galx-desktop/open-app',app],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL))
            dock.pack_start(b,False,False,0)
        root.pack_end(dock,False,False,0)
        GLib.timeout_add_seconds(1,self.tick);self.tick()
    def tick(self):
        self.clock.set_text(datetime.datetime.now().strftime('%a %b %d   %H:%M'))
        return True

Desktop().show_all()
Gtk.main()
