import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, Router, useLocation } from 'wouter';
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, CalendarDays, Check, CheckCheck, Menu, X,
  ChevronLeft, CircleHelp, Clock3, Home, MessageCircle, Search, Settings,
  ShieldCheck, Star, Users, Video, BookMarked, ChartNoAxesCombined, UserRound,
  ClipboardCheck,
} from 'lucide-react';
import StaffWelcome from '@/components/StaffWelcome';
import StaffAuthDialog, { type StaffAuthMode } from '@/components/StaffAuthDialog';

type Role = 'teacher' | 'supervisor';
const ASSET_BASE = import.meta.env.BASE_URL;
type Student = { id: string; name: string; level: string; juz: number; score: number; attendance: string; next: string; circle: string };
type Session = { id: string; student: string; teacher: string; type: string; topic: string; day: string; time: string; state: string; duration: number };

const students: Student[] = [
  { id:'s1', name:'ليان عبد الرحمن', level:'الحفظ — المستوى الثالث', juz:8, score:94, attendance:'منتظم', next:'الأحد، ٥:٣٠ م', circle:'حلقة النور' },
  { id:'s2', name:'يوسف خالد', level:'الحفظ — المستوى الثاني', juz:5, score:82, attendance:'منتظم', next:'الاثنين، ٦:٠٠ م', circle:'حلقة النور' },
  { id:'s3', name:'مريم أحمد', level:'تصحيح التلاوة', juz:2, score:76, attendance:'يحتاج متابعة', next:'الثلاثاء، ٤:٣٠ م', circle:'حلقة الإتقان' },
  { id:'s4', name:'عمر فهد', level:'المراجعة — المستوى الأول', juz:11, score:89, attendance:'منتظم', next:'الأربعاء، ٥:٠٠ م', circle:'حلقة النور' },
  { id:'s5', name:'سارة ناصر', level:'الحفظ — المستوى الأول', juz:3, score:68, attendance:'غياب حديث', next:'الخميس، ٦:٣٠ م', circle:'حلقة الإتقان' },
];
const sessions: Session[] = [
  { id:'h1', student:'ليان عبد الرحمن', teacher:'أ. هدى السالم', type:'حفظ قرآن', topic:'سورة النساء · الآيات ٣٦–٤٢', day:'الأحد', time:'٥:٣٠ م', state:'قادمة', duration:30 },
  { id:'h2', student:'يوسف خالد', teacher:'أ. هدى السالم', type:'مراجعة قرآن', topic:'سورة آل عمران', day:'الاثنين', time:'٦:٠٠ م', state:'قادمة', duration:30 },
  { id:'h3', student:'مريم أحمد', teacher:'أ. هدى السالم', type:'تصحيح تلاوة', topic:'مخارج الحروف', day:'الثلاثاء', time:'٤:٣٠ م', state:'قادمة', duration:25 },
  { id:'h4', student:'عمر فهد', teacher:'أ. هدى السالم', type:'حفظ قرآن', topic:'سورة المائدة', day:'الأربعاء', time:'٥:٠٠ م', state:'قادمة', duration:30 },
  { id:'h5', student:'سارة ناصر', teacher:'أ. هدى السالم', type:'مراجعة قرآن', topic:'جزء عمّ', day:'الخميس', time:'٦:٣٠ م', state:'قادمة', duration:30 },
  { id:'h6', student:'ليان عبد الرحمن', teacher:'أ. هدى السالم', type:'حفظ قرآن', topic:'سورة النساء', day:'السبت', time:'٥:٣٠ م', state:'مكتملة', duration:30 },
];
const pending = [
  { id:'e1', student:'يوسف خالد', type:'حفظ قرآن', topic:'سورة آل عمران · ١٠–١٥', date:'اليوم، ٦:٠٠ م' },
  { id:'e2', student:'مريم أحمد', type:'تصحيح تلاوة', topic:'مخارج الحروف', date:'أمس، ٤:٣٠ م' },
  { id:'e3', student:'عمر فهد', type:'مراجعة قرآن', topic:'سورة النساء', date:'الأربعاء، ٥:٠٠ م' },
];
const accounts = [
  { id:'u1', name:'أ. هدى السالم', role:'معلمة', phone:'٠٥٠ ١٢٣ ٤٥٦٧', status:'نشط', detail:'متوسط التقييم ٩٢٪ · ١٢ طالباً' },
  { id:'u2', name:'أ. ناصر العتيبي', role:'معلم', phone:'٠٥٥ ٤٣٢ ١٠٩٨', status:'نشط', detail:'متوسط التقييم ٨٨٪ · ٩ طلاب' },
  { id:'u3', name:'ليان عبد الرحمن', role:'طالبة', phone:'٠٥٤ ٦٧٨ ٢٣١٠', status:'نشط', detail:'المستوى الثالث · ٨ أجزاء' },
  { id:'u4', name:'مريم أحمد', role:'طالبة', phone:'٠٥٦ ٨٧٦ ٥٤٣٢', status:'نشط', detail:'تصحيح التلاوة · جزآن' },
  { id:'u5', name:'أ. ريم الحربي', role:'معلمة', phone:'٠٥٠ ٩٨٧ ٦٥٤٣', status:'مراجعة', detail:'طلب قبول معلم · منذ ١٨ ساعة' },
];
const notificationsSeed = [
  { id:'n1', title:'تقييم ينتظر إكماله', body:'حصة يوسف خالد في حفظ القرآن بانتظار تقييمك.', time:'منذ ٢٠ دقيقة', kind:'evaluation', read:false },
  { id:'n2', title:'موعد حلقة قريب', body:'حلقة ليان عبد الرحمن اليوم عند ٥:٣٠ م.', time:'منذ ساعتين', kind:'session', read:false },
  { id:'n3', title:'ملاحظة إشرافية', body:'تمت مراجعة ملخص تقدم حلقة النور.', time:'أمس', kind:'note', read:true },
];
const teacherNav = [
  { href:'/teacher', label:'الرئيسية', Icon:Home },
  { href:'/teacher/students', label:'طلابي', Icon:Users },
  { href:'/teacher/schedule', label:'جدولي', Icon:CalendarDays },
  { href:'/teacher/evaluations', label:'التقييمات', Icon:ClipboardCheck },
  { href:'/teacher/notifications', label:'التنبيهات', Icon:Bell },
];
const supervisorNav = [
  { href:'/supervisor', label:'الرئيسية', Icon:Home },
  { href:'/supervisor/users', label:'الحسابات', Icon:Users },
  { href:'/supervisor/schedules', label:'الجداول', Icon:CalendarDays },
  { href:'/supervisor/sessions', label:'الحلقات', Icon:Video },
  { href:'/supervisor/reviews', label:'المراجعات', Icon:ClipboardCheck },
  { href:'/supervisor/notifications', label:'التنبيهات', Icon:Bell },
];

function App() {
  return <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Workspace /></Router>;
}

function Workspace() {
  const [path, setPath] = useLocation();
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [staffAuthMode, setStaffAuthMode] = useState<StaffAuthMode>('closed');
  const isHome = path === '/';
  const isDemoChooser = path === '/demo';
  const role: Role = path.startsWith('/supervisor') ? 'supervisor' : 'teacher';
  const activeNav = role === 'teacher' ? teacherNav : supervisorNav;
  const title = routeTitle(path);
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };
  const openTeacherRegistration = useCallback(() => setStaffAuthMode('teacher-register'), []);
  const openStaffLogin = useCallback(() => setStaffAuthMode('choice'), []);
  const closeStaffAuth = useCallback(() => setStaffAuthMode('closed'), []);
  useEffect(() => {
    const handler = (event: Event) => setPath((event as CustomEvent<string>).detail);
    window.addEventListener('tabyan-navigate', handler);
    return () => window.removeEventListener('tabyan-navigate', handler);
  }, [setPath]);
  useEffect(() => {
    if (path === '/' || path === '/demo' || path === '/teacher' || path === '/supervisor') setSelected('');
  }, [path]);

  const screen = isDemoChooser ? <RoleChooser /> : routeScreen(path, {
    notify, selected, setSelected, readOnly:isReadOnly, setReadOnly:setIsReadOnly,
  });
  if (isHome) return (
    <div className="staff-welcome-page">
      <StaffWelcome onTeacherRegister={openTeacherRegistration} onStaffLogin={openStaffLogin} />
      <StaffAuthDialog mode={staffAuthMode} onModeChange={setStaffAuthMode} onClose={closeStaffAuth} />
    </div>
  );
  if (isDemoChooser) return (
    <div className="app-shell" dir="rtl">
      <div className="preview-frame">
        <TopBar title="استعراض الواجهات التجريبية" />
        <div className="notice" role="note"><strong>تنبيه:</strong> هذه الواجهات للعرض فقط؛ الحسابات والسجلات لا تتصل ببيانات حقيقية. استخدم الشاشة الترحيبية للتسجيل أو الدخول الفعلي.</div>
        <main className="content page-enter">{screen}</main>
      </div>
    </div>
  );
  const goSettings = () => setPath(`/${role}/settings`);
  return (
    <div className="app-shell" dir="rtl" data-testid="app-workspace">
      <aside className="desktop-side" aria-label="التنقل الرئيسي">
        <div className="side-brand"><img src={`${ASSET_BASE}brand/logo-light.png`} alt="شعار تبيان"/><div><div className="brand-word">لوحة {role==='teacher'?'المعلم':'الإشراف'}</div><div className="brand-sub">مساحة عمل تبيان</div><span className="side-demo-badge">وضع العرض</span></div></div>
        <nav className="side-nav">{activeNav.map(({href,label,Icon})=><Link key={href} href={href} className={`nav-link ${isActive(path,href)?'active':''}`} data-testid={`nav-${href.replaceAll('/','-').slice(1)}`}><Icon/><span>{label}</span></Link>)}
          <Link href={`/${role}/settings`} className={`nav-link ${path.endsWith('/settings')?'active':''}`} data-testid="nav-settings"><Settings/><span>الإعدادات</span></Link>
        </nav>
          <div style={{marginTop:'auto'}}><div className="notice-inline" style={{background:'rgba(255,255,255,.09)',color:'#f1d27a'}}>بيانات العرض محلية فقط، ولا تُحفظ بعد إغلاق الصفحة.</div><Link href="/demo" className="nav-link" style={{marginTop:10}} data-testid="nav-role-switch"><ArrowRight/><span>اختيار الدور</span></Link></div>
      </aside>
      <div className="preview-frame">
        <TopBar title={title} onSettings={goSettings} notificationsHref={`/${role}/notifications`} onMenuClick={()=>setMenuOpen(true)}/>
        <div className="notice" role="note" data-testid="preview-notice"><strong>معاينة محلية فقط:</strong> بيانات الأشخاص والسجلات تجريبية. التغييرات مؤقتة في هذه الصفحة ولا تُرسل أو تُحفظ في أي نظام.</div>
        <main className="content page-enter" key={path}>
          {screen}
        </main>
      </div>
      {menuOpen&&<div className="mobile-drawer-layer">
        <button className="drawer-scrim" aria-label="إغلاق القائمة" onClick={()=>setMenuOpen(false)}/>
        <aside className="mobile-drawer" role="dialog" aria-modal="true" aria-label="قائمة التنقل">
          <div className="drawer-head"><div className="side-brand"><img src={`${ASSET_BASE}brand/logo-light.png`} alt=""/><div><div className="brand-word">لوحة {role==='teacher'?'المعلم':'الإشراف'}</div><div className="brand-sub">مساحة عمل تبيان</div></div></div><button className="icon-button" onClick={()=>setMenuOpen(false)} aria-label="إغلاق القائمة"><X size={18}/></button></div>
          <nav className="side-nav">{activeNav.map(({href,label,Icon})=><Link key={href} href={href} onClick={()=>setMenuOpen(false)} className={`nav-link ${isActive(path,href)?'active':''}`}><Icon/><span>{label}</span></Link>)}<Link href={`/${role}/settings`} onClick={()=>setMenuOpen(false)} className={`nav-link ${path.endsWith('/settings')?'active':''}`}><Settings/><span>الإعدادات</span></Link></nav>
          <div className="drawer-footer"><div className="notice-inline">بيانات العرض محلية فقط، ولا تُحفظ بعد إغلاق الصفحة.</div><Link href="/demo" className="nav-link" onClick={()=>setMenuOpen(false)}><ArrowRight/><span>اختيار الدور</span></Link></div>
        </aside>
      </div>}
      {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
    </div>
  );
}

function TopBar({title, onSettings, notificationsHref, onMenuClick}:{title?:string;onSettings?:()=>void;notificationsHref?:string;onMenuClick?:()=>void}) {
  return <header className="topbar"><div className="topbar-inner">
    <div className="topbar-start">{onMenuClick&&<button className="icon-button menu-trigger" onClick={onMenuClick} aria-label="فتح القائمة" data-testid="button-open-menu"><Menu size={18}/></button>}<Link href="/" className="brand-lockup" data-testid="link-brand-home"><img src={`${ASSET_BASE}brand/logo-light.png`} alt="تبيان"/><div><div className="brand-word">TABYAN STAFF</div><div className="brand-sub">{title ?? 'معاينة المعلمين والمشرفين'}</div></div></Link></div>
    <div className="topbar-actions"><span className="preview-tag"><span className="preview-dot"/>وضع المعاينة</span>{notificationsHref&&<Link className="icon-button" href={notificationsHref} aria-label="الإشعارات" data-testid="link-open-notifications"><Bell size={17}/></Link>}{onSettings&&<button className="icon-button settings-trigger" onClick={onSettings} aria-label="الإعدادات" data-testid="button-open-settings"><Settings size={17}/></button>}</div>
  </div></header>;
}
function BottomNav({items,path}:{items:typeof teacherNav;path:string}) {
  const shortItems=items.slice(0,5);
  return <nav className="bottom-nav" aria-label="التنقل السفلي"><div className="bottom-nav-inner">{shortItems.map(({href,label,Icon})=><Link key={href} href={href} className={`nav-link ${isActive(path,href)?'active':''}`} data-testid={`mobile-nav-${href.replaceAll('/','-').slice(1)}`}><Icon/><span>{label}</span></Link>)}</div></nav>;
}
function isActive(path:string,href:string) { return path === href || (href !== '/teacher' && href !== '/supervisor' && path.startsWith(href)); }
function routeTitle(path:string) {
  const map:Record<string,string>={'/demo':'استعراض الواجهات التجريبية','/teacher':'مساحة المعلم','/teacher/students':'طلابي','/teacher/schedule':'جدولي','/teacher/evaluations':'التقييمات','/teacher/notifications':'الإشعارات','/teacher/settings':'الإعدادات','/supervisor':'لوحة المشرف','/supervisor/users':'إدارة الحسابات','/supervisor/schedules':'الجداول','/supervisor/sessions':'متابعة الحلقات','/supervisor/reviews':'المراجعات','/supervisor/notifications':'الإشعارات','/supervisor/settings':'الإعدادات'};
  if(path.startsWith('/teacher/students/')) return 'ملف الطالب';
  if(path.startsWith('/teacher/evaluations/')) return 'تقييم الحصة';
  if(path.startsWith('/teacher/schedule/')) return 'تفاصيل الحصة';
  if(path.startsWith('/supervisor/users/')) return 'بيانات الحساب';
  return map[path] ?? 'TABYAN STAFF';
}
function routeScreen(path:string,ctx:ScreenContext) {
  if(path==='/teacher') return <TeacherHome notify={ctx.notify}/>;
  if(path==='/teacher/students') return <StudentsScreen onSelect={id=>{ctx.setSelected(id);historyNavigate(`/teacher/students/${id}`)}}/>;
  if(path.startsWith('/teacher/students/')) return <StudentDetail id={path.split('/').at(-1) ?? ''} notify={ctx.notify}/>;
  if(path==='/teacher/schedule') return <TeacherSchedule notify={ctx.notify} onSelect={id=>{ctx.setSelected(id);historyNavigate(`/teacher/schedule/${id}`)}}/>;
  if(path.startsWith('/teacher/schedule/')) return <SessionDetail id={path.split('/').at(-1) ?? ''} notify={ctx.notify}/>;
  if(path==='/teacher/evaluations') return <Evaluations onSelect={id=>{ctx.setSelected(id);historyNavigate(`/teacher/evaluations/${id}`)}}/>;
  if(path.startsWith('/teacher/evaluations/')) return <EvaluationForm id={path.split('/').at(-1) ?? ''} notify={ctx.notify}/>;
  if(path==='/teacher/notifications'||path==='/supervisor/notifications') return <Notifications notify={ctx.notify}/>;
  if(path==='/teacher/settings'||path==='/supervisor/settings') return <SettingsScreen notify={ctx.notify} readOnly={ctx.readOnly} setReadOnly={ctx.setReadOnly}/>;
  if(path==='/supervisor') return <SupervisorHome/>;
  if(path==='/supervisor/users') return <UsersScreen onSelect={id=>historyNavigate(`/supervisor/users/${id}`)}/>;
  if(path.startsWith('/supervisor/users/')) return <AccountDetail id={path.split('/').at(-1) ?? ''} notify={ctx.notify}/>;
  if(path==='/supervisor/schedules') return <SupervisorSchedules notify={ctx.notify}/>;
  if(path==='/supervisor/sessions') return <SupervisorSessions notify={ctx.notify}/>;
  if(path==='/supervisor/reviews') return <Reviews notify={ctx.notify}/>;
  return <NotFound/>;
}
type ScreenContext = {notify:(s:string)=>void;selected:string;setSelected:(s:string)=>void;readOnly:boolean;setReadOnly:(b:boolean)=>void};

// Wouter owns navigation; this helper dispatches a browser-local custom event that the shell consumes.
function historyNavigate(path:string) { window.dispatchEvent(new CustomEvent('tabyan-navigate',{detail:path})); }
function RoleChooser() {
  return <div className="chooser page-enter">
    <div className="hero-panel">
      <div className="eyebrow" style={{color:'#f1d27a'}}>منصة تبيان التعليمية · بيئة تجريبية</div>
      <h1 className="hero-title">مساحة هادئة<br/>لرعاية التعلّم القرآني.</h1>
      <p className="muted" style={{maxWidth:460,lineHeight:1.8,margin:0}}>اختر الدور لاستكشاف واجهات العمل اليومية للمعلم أو المشرف. كل الأسماء والسجلات هنا أمثلة محلية.</p>
      <div style={{position:'relative',zIndex:1,marginTop:17}}><span className="preview-tag"><span className="preview-dot"/>بيانات الواجهات التجريبية محلية</span></div>
    </div>
    <div className="grid-2" style={{marginTop:14}}>
      <Link href="/teacher" className="card role-card" data-testid="role-teacher">
        <div className="row-between"><span className="avatar gold"><BookOpen size={20}/></span><ArrowLeft size={18} color="#946f14"/></div>
        <div style={{marginTop:16}}><div className="card-title">مساحة المعلم</div><div className="muted tiny" style={{marginTop:4}}>متابعة الطلاب، المواعيد، وتقييم التلاوة.</div></div>
        <div className="divider"/><div className="eyebrow">٥ طلاب تجريبيين · ٣ تقييمات معلقة</div>
      </Link>
      <Link href="/supervisor" className="card role-card" data-testid="role-supervisor">
        <div className="row-between"><span className="avatar gold"><ShieldCheck size={20}/></span><ArrowLeft size={18} color="#946f14"/></div>
        <div style={{marginTop:16}}><div className="card-title">مساحة المشرف</div><div className="muted tiny" style={{marginTop:4}}>نظرة على الحسابات والحلقات والمراجعات.</div></div>
        <div className="divider"/><div className="eyebrow">١٢ حساباً · ٤ عناصر للمتابعة</div>
      </Link>
    </div>
    <div className="notice-inline" style={{marginTop:13}}>هذه واجهة استكشافية وليست تطبيقاً تشغيلياً للموظفين. لن تُرسل الرسائل أو التقييمات ولن تُعدّل أي بيانات حقيقية.</div>
  </div>;
}

function PageHeading({title,subtitle,action}:{title:string;subtitle?:string;action?:ReactNode}) {
  return <div className="row-between" style={{alignItems:'flex-start',marginBottom:17}}><div><h1 className="page-title">{title}</h1>{subtitle&&<p className="page-subtitle">{subtitle}</p>}</div>{action}</div>;
}
function StatGrid({items}:{items:{value:string;label:string}[]}) {
  return <div className="stats" style={{marginTop:15}}>{items.map((s,i)=><div className="stat" key={s.label} data-testid={`stat-${i}`}><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>)}</div>;
}
function TeacherHome({notify}:{notify:(s:string)=>void}) {
  return <div className="page-enter">
    <div className="hero-panel" data-testid="teacher-overview"><div className="eyebrow" style={{color:'#f1d27a'}}>الأحد، ١٤ ربيع الآخر</div><h1 className="hero-title">السلام عليكم، أ. هدى</h1><p className="muted" style={{margin:'2px 0 0'}}>نسأل الله أن يبارك في وقتك وتعليمك.</p><StatGrid items={[{value:'٥',label:'طلاب أتابعهم'},{value:'٤',label:'حصص هذا الأسبوع'},{value:'٣',label:'تقييمات معلقة'},{value:'٩٢٪',label:'متوسط التقييم'}]}/></div>
    <div className="section-head"><h2 className="section-heading" style={{margin:0}}>حصتك القادمة</h2><Link href="/teacher/schedule" className="tiny" style={{color:'#800020'}} data-testid="link-full-schedule">عرض الجدول <ChevronLeft size={13} style={{verticalAlign:'middle'}}/></Link></div>
    <button className="list-item" onClick={()=>historyNavigate('/teacher/schedule/h1')} data-testid="card-next-session"><div className="row"><div className="avatar gold"><CalendarDays size={18}/></div><div className="grow"><div className="card-title">حفظ قرآن — سورة النساء</div><div className="muted tiny">ليان عبد الرحمن · اليوم، ٥:٣٠ م · ٣٠ دقيقة</div></div><span className="badge gold">بعد ٤٥ د</span></div><div className="divider"/><div className="row-between tiny"><span className="muted">تذكير شخصي: مراجعة الآيات ٣٦–٤٢</span><span style={{color:'#800020',fontWeight:700}}>تفاصيل الحصة ←</span></div></button>
    <div className="section-head"><h2 className="section-heading" style={{margin:0}}>لمحة عن الأسبوع</h2><span className="eyebrow">بيانات تجريبية</span></div>
    <div className="grid-3">{[{v:'٤',l:'حصة مكتملة'},{v:'٢٫٥',l:'ساعة تعليم'},{v:'٧',l:'تلاوات تمت مراجعتها'}].map(x=><div className="card" key={x.l} style={{padding:'13px 9px',textAlign:'center'}}><div className="stat-value" style={{color:'#800020'}}>{x.v}</div><div className="eyebrow">{x.l}</div></div>)}</div>
    <div className="section-head"><h2 className="section-heading" style={{margin:0}}>تحتاج انتباهك</h2></div>
    <div className="list">
      <Link href="/teacher/evaluations" className="list-item" data-testid="quick-pending-evaluations"><div className="row"><span className="avatar gold"><ClipboardCheck size={18}/></span><div className="grow"><div className="card-title">٣ تقييمات بانتظارك</div><div className="muted tiny">أكمل ملاحظات الحصص المكتملة</div></div><ArrowLeft size={17}/></div></Link>
      <Link href="/teacher/students/s5" className="list-item" data-testid="quick-student-followup"><div className="row"><span className="avatar"><UserRound size={18}/></span><div className="grow"><div className="card-title">متابعة سارة ناصر</div><div className="muted tiny">غياب حديث — اطلع على ملف الطالبة</div></div><ArrowLeft size={17}/></div></Link>
    </div>
    <div className="row" style={{marginTop:15}}><button className="btn btn-primary btn-block" onClick={()=>notify('التنقل إلى التقييمات التجريبية')} data-testid="button-evaluations-shortcut"><ClipboardCheck size={16}/>استكمال التقييمات</button><Link href="/teacher/students" className="btn btn-outline btn-block" data-testid="button-students-shortcut"><Users size={16}/>طلابي</Link></div>
  </div>;
}

function StudentsScreen({onSelect}:{onSelect:(id:string)=>void}) {
  const [query,setQuery]=useState(''); const [filter,setFilter]=useState('الكل');
  const shown=students.filter(s=>(s.name.includes(query)||s.level.includes(query))&&(filter==='الكل'||(filter==='تحتاج متابعة'&&s.attendance!=='منتظم')||(filter==='منتظم'&&s.attendance==='منتظم')));
  return <div><PageHeading title="طلابي" subtitle={`تتابع مسيرة ${shown.length} طالب وطالبة · جميع السجلات تجريبية`}/>
    <div className="search-wrap"><Search size={16}/><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم الطالب أو المستوى…" data-testid="input-student-search"/></div>
    <div className="filter-row" style={{margin:'10px 0 13px'}}>{['الكل','منتظم','تحتاج متابعة'].map(x=><button key={x} className={`filter ${filter===x?'active':''}`} onClick={()=>setFilter(x)} data-testid={`filter-students-${x}`}>{x}</button>)}</div>
    <div className="list">{shown.map(s=><button className="list-item" key={s.id} onClick={()=>onSelect(s.id)} data-testid={`student-card-${s.id}`}><div className="row"><span className="avatar">{s.name[0]}</span><div className="grow"><div className="row-between"><span className="card-title">{s.name}</span><span className={`badge ${s.score>=90?'green':s.score<75?'gold':'soft'}`}>{s.score}٪</span></div><div className="muted tiny" style={{marginTop:3}}>{s.level}</div></div><ChevronLeft size={17} color="#8f4a5b"/></div><div className="row-between tiny" style={{marginTop:11}}><span className="muted"><BookMarked size={12} style={{verticalAlign:'middle'}}/> {s.juz} أجزاء محفوظة</span><span className={`badge ${s.attendance==='منتظم'?'green':'gold'}`}>{s.attendance}</span></div><div className="progress" style={{marginTop:8}}><span style={{width:`${s.score}%`}}/></div></button>)}
      {!shown.length&&<Empty title="لا توجد نتائج" body="جرّب البحث باسم مختلف أو غيّر التصفية."/>}
    </div>
  </div>;
}
function StudentDetail({id,notify}:{id:string;notify:(s:string)=>void}) {
  const s=students.find(x=>x.id===id)??students[0]; const [msg,setMsg]=useState(''); const [showMsg,setShowMsg]=useState(false); const [tab,setTab]=useState('التقدم');
  return <div><Link href="/teacher/students" className="tiny" style={{color:'#800020'}} data-testid="link-back-students"><ArrowRight size={14} style={{verticalAlign:'middle'}}/> العودة إلى الطلاب</Link>
    <div className="card" style={{textAlign:'center',marginTop:12}} data-testid="student-profile"><div className="avatar" style={{width:62,height:62,fontSize:23,margin:'auto'}}>{s.name[0]}</div><h1 className="page-title" style={{marginTop:10}}>{s.name}</h1><div className="muted tiny">{s.level} · سجل تجريبي</div><div className="row" style={{justifyContent:'center',marginTop:12,flexWrap:'wrap'}}><span className="badge gold">{s.juz} أجزاء محفوظة</span><span className="badge green">آخر تقييم {s.score}٪</span><span className="badge soft">{s.circle}</span></div></div>
    <div className="tabs" style={{marginTop:12}}>{['التقدم','الحصص','التقييمات'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)} data-testid={`student-tab-${t}`}>{t}</button>)}</div>
    {tab==='التقدم'&&<><div className="card" style={{marginTop:10}}><div className="row-between"><div><div className="card-title">التقدم في المستوى</div><div className="muted tiny">مسار الحفظ · المستوى الحالي</div></div><span className="badge gold">{s.juz}/١٥ جزءاً</span></div><div className="progress" style={{marginTop:13}}><span style={{width:`${Math.min(s.juz/15*100,100)}%`}}/></div><div className="row-between tiny muted" style={{marginTop:6}}><span>بداية المتابعة: ١ ربيع الأول</span><span>موعد قادم: {s.next}</span></div></div><div className="card" style={{marginTop:10}}><div className="card-title">ملاحظة المعلم</div><p className="muted tiny" style={{lineHeight:1.8,marginBottom:0}}>تقدّم {s.name.split(' ')[0]} بثبات. نواصل تثبيت المحفوظ ونراجع مواضع الوقف في اللقاء القادم.</p></div></>}
    {tab==='الحصص'&&<div className="list" style={{marginTop:10}}>{sessions.filter(x=>x.student===s.name).map(x=><div className="card" key={x.id}><div className="row-between"><b>{x.type}</b><span className="badge soft">{x.state}</span></div><div className="muted tiny" style={{marginTop:5}}>{x.topic} · {x.day} {x.time}</div></div>)}</div>}
    {tab==='التقييمات'&&<div className="card" style={{marginTop:10}}><div className="row-between"><b>آخر تقييم</b><span className="badge green">{s.score}/١٠٠</span></div><div className="muted tiny" style={{marginTop:6}}>الحفظ ٤٤/٥٠ · المراجعة ١٨/٢٠ · التجويد ١٨/٢٠ · الأداء ٩/١٠</div><div className="divider"/><div className="tiny">ملاحظة: أداء متزن، مع عناية أكبر بمدود الآيات.</div></div>}
    <div className="row" style={{marginTop:12}}><button className="btn btn-primary btn-block" onClick={()=>setShowMsg(!showMsg)} data-testid="button-message-student"><MessageCircle size={15}/>كتابة رسالة تشجيع</button><button className="btn btn-outline" onClick={()=>notify('طلب الانتقال في هذا العرض توضيحي فقط.')} data-testid="button-level-request">طلب انتقال</button></div>
    {showMsg&&<div className="card" style={{marginTop:10}}><label className="field-label" htmlFor="student-message">رسالة محلية تجريبية</label><textarea id="student-message" className="textarea" value={msg} onChange={e=>setMsg(e.target.value)} placeholder="اكتب تشجيعاً أو واجباً منزلياً…" data-testid="input-student-message"/><button className="btn btn-gold btn-block" style={{marginTop:8}} onClick={()=>{notify('تم عرض تأكيد محلي فقط؛ لم تُرسل الرسالة.');setMsg('');setShowMsg(false)}} disabled={!msg.trim()} data-testid="button-send-student-message">معاينة الإرسال</button></div>}
  </div>;
}
function TeacherSchedule({notify,onSelect}:{notify:(s:string)=>void;onSelect:(id:string)=>void}) {
  const [range,setRange]=useState('الأسبوع'); const [day,setDay]=useState('الكل');
  const days=['الكل','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'];
  const rows=sessions.filter(s=>range==='اليوم'?s.day==='الأحد':range==='غداً'?s.day==='الاثنين':true).filter(s=>day==='الكل'||s.day===day);
  return <div><PageHeading title="جدولي" subtitle="المواعيد المعتمدة · نظرة أسبوعية محلية"/>
    <div className="tabs">{['اليوم','غداً','الأسبوع','الشهر'].map(x=><button key={x} className={range===x?'active':''} onClick={()=>setRange(x)} data-testid={`schedule-range-${x}`}>{x}</button>)}</div>
    <div className="filter-row" style={{margin:'10px 0'}}>{days.map(x=><button key={x} className={`filter ${day===x?'active':''}`} onClick={()=>setDay(x)} data-testid={`schedule-day-${x}`}>{x}</button>)}</div>
    <div className="notice-inline" style={{marginBottom:12}}>المشرف ينشئ الجداول في النظام. هذه المعاينة لا تغيّر المواعيد.</div>
    <div className="list">{rows.map(s=><button key={s.id} className="list-item" onClick={()=>onSelect(s.id)} data-testid={`schedule-item-${s.id}`}><div className="row"><div className="avatar gold"><Clock3 size={18}/></div><div className="grow"><div className="row-between"><span className="card-title">{s.type}</span><span className={`badge ${s.state==='مكتملة'?'green':'gold'}`}>{s.state}</span></div><div className="muted tiny">{s.topic}</div><div className="eyebrow" style={{marginTop:5}}>{s.student} · {s.day} · {s.time} · {s.duration} دقيقة</div></div><ChevronLeft size={16}/></div></button>)}</div>
    <button className="btn btn-outline btn-block" style={{marginTop:12}} onClick={()=>notify('طلبات تغيير المواعيد غير مفعّلة في المعاينة.')} data-testid="button-change-request">طلبات تغيير المواعيد <span className="badge gold">١</span></button>
  </div>;
}
function SessionDetail({id,notify}:{id:string;notify:(s:string)=>void}) {
  const s=sessions.find(x=>x.id===id)??sessions[0]; const [note,setNote]=useState('');
  return <div><Link href="/teacher/schedule" className="tiny" style={{color:'#800020'}} data-testid="link-back-schedule"><ArrowRight size={14} style={{verticalAlign:'middle'}}/> العودة إلى الجدول</Link><PageHeading title="تفاصيل الحصة" subtitle="تفاصيل محلية لسجل تجريبي"/>
    <div className="card"><div className="row-between"><span className="badge gold">{s.state}</span><span className="eyebrow">{s.day} · {s.time}</span></div><h2 className="section-heading" style={{margin:'10px 0 3px'}}>{s.type}</h2><div className="muted tiny">{s.topic}</div><div className="divider"/><div className="checkline"><span>الطالب</span><b>{s.student}</b></div><div className="checkline"><span>المدة</span><b>{s.duration} دقيقة</b></div><div className="checkline"><span>المسار</span><b>حلقة النور · حفظ ومراجعة</b></div><div className="checkline"><span>رابط الغرفة</span><span className="muted">غير متاح في المعاينة</span></div></div>
    <div className="card" style={{marginTop:10}}><div className="row"><span className="avatar gold"><BookOpen size={16}/></span><div><div className="card-title">مقترح التحضير</div><div className="muted tiny">استمع للتلاوة كاملة ثم سجّل ملاحظة تعليمية محددة.</div></div></div><label className="field-label" style={{marginTop:13}} htmlFor="session-note">ملاحظة خاصة بك</label><textarea id="session-note" className="textarea" value={note} onChange={e=>setNote(e.target.value)} placeholder="نقاط للتركيز أثناء الحصة…" data-testid="input-session-note"/><button className="btn btn-gold btn-block" style={{marginTop:8}} onClick={()=>notify(note.trim()?'حُفظت الملاحظة مؤقتاً لهذه الصفحة.':'اكتب ملاحظة أولاً.')} data-testid="button-save-session-note">حفظ محلي مؤقت</button></div>
    <button className="btn btn-primary btn-block" style={{marginTop:10}} onClick={()=>notify('دخول الغرفة غير متاح في المعاينة المحلية.')} data-testid="button-session-room"><Video size={16}/>دخول غرفة الحصة (معاينة فقط)</button>
  </div>;
}
function Evaluations({onSelect}:{onSelect:(id:string)=>void}) {
  const [query,setQuery]=useState(''); const rows=pending.filter(x=>`${x.student} ${x.type} ${x.topic}`.includes(query));
  return <div><PageHeading title="التقييمات المعلقة" subtitle="حصص مكتملة تنتظر ملاحظتك التعليمية"/>
    <div className="card" style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}><span className="avatar gold"><ClipboardCheck size={18}/></span><div><div className="card-title">٣ حصص بانتظار التقييم</div><div className="muted tiny">التقييم توصية تعليمية ولا يغيّر مستوى الطالب.</div></div></div>
    <div className="search-wrap" style={{marginBottom:11}}><Search size={16}/><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم الطالب أو الحصة…" data-testid="input-evaluation-search"/></div>
    <div className="list">{rows.map(x=><div className="list-item" key={x.id} data-testid={`evaluation-${x.id}`}><div className="row"><span className="avatar"><BookOpen size={18}/></span><div className="grow"><div className="card-title">{x.student}</div><div className="muted tiny">{x.type} · {x.topic}</div><div className="eyebrow" style={{marginTop:4}}>{x.date}</div></div></div><button className="btn btn-primary btn-block btn-small" style={{marginTop:10}} onClick={()=>onSelect(x.id)} data-testid={`button-evaluate-${x.id}`}>تقييم الحصة <ArrowLeft size={14}/></button></div>)}{!rows.length&&<Empty title="لا توجد نتائج" body="لم نعثر على حصة مطابقة للبحث."/>}</div>
  </div>;
}
function EvaluationForm({id,notify}:{id:string;notify:(s:string)=>void}) {
  const item=pending.find(x=>x.id===id)??pending[0]; const [scores,setScores]=useState([40,16,16,8]); const [rec,setRec]=useState('الاستمرار'); const [notes,setNotes]=useState('');
  const labels=[['الحفظ الجديد',50],['المراجعة',20],['التجويد',20],['الأداء',10]] as const;
  const total=scores.reduce((a,b)=>a+b,0);
  return <div><Link href="/teacher/evaluations" className="tiny" style={{color:'#800020'}} data-testid="link-back-evaluations"><ArrowRight size={14} style={{verticalAlign:'middle'}}/> التقييمات المعلقة</Link><PageHeading title="تقييم الحصة" subtitle={`${item.student} · ${item.type} · سجل تجريبي`}/>
    <div className="card" style={{textAlign:'center',marginBottom:10}}><div className="muted tiny">{item.topic}</div><div className="row" style={{justifyContent:'center',marginTop:7}}><span className="eyebrow">المجموع</span><strong style={{fontSize:27,color:'#800020'}} data-testid="evaluation-total">{total}</strong><span className="muted">/١٠٠</span></div></div>
    <div className="card">{labels.map(([label,max],i)=><div key={label} style={{marginBottom:i<3?17:2}}><div className="row-between"><label className="field-label" htmlFor={`score-${i}`} style={{margin:0}}>{label}</label><span className="badge gold">{scores[i]} / {max}</span></div><input id={`score-${i}`} type="range" min="0" max={max} value={scores[i]} onChange={e=>setScores(scores.map((s,j)=>j===i?Number(e.target.value):s))} style={{width:'100%',accentColor:'#800020',marginTop:7}} data-testid={`input-score-${i}`}/></div>)}
      <div className="divider"/><label className="field-label">التوصية التعليمية</label><div className="grid-3">{['ترشيح للترقية','الاستمرار','يحتاج مراجعة'].map(x=><button className={`filter ${rec===x?'active':''}`} key={x} onClick={()=>setRec(x)} data-testid={`recommend-${x}`}>{x}</button>)}</div><div className="eyebrow" style={{marginTop:7}}>التوصية لا تنفذ انتقالاً، والقرار النهائي للمشرف.</div>
      <label className="field-label" htmlFor="evaluation-notes" style={{marginTop:14}}>ملاحظات للطالب</label><textarea id="evaluation-notes" className="textarea" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500} placeholder="نقاط القوة وما يحتاج تحسيناً…" data-testid="input-evaluation-notes"/>
      <div className="row-between tiny muted" style={{marginTop:4}}><span>التسجيل محلي مؤقت فقط</span><span>{notes.length}/٥٠٠</span></div>
      <button className="btn btn-primary btn-block" style={{marginTop:12}} onClick={()=>notify(`تمت معاينة التقييم محلياً (${total}/١٠٠). لا توجد نتيجة محفوظة.`)} data-testid="button-submit-evaluation"><Check size={16}/>معاينة التقييم · {total}/١٠٠</button>
    </div>
  </div>;
}
function Notifications({notify}:{notify:(s:string)=>void}) {
  const [filter,setFilter]=useState('الكل'); const [rows,setRows]=useState(notificationsSeed);
  const visible=rows.filter(n=>filter==='الكل'||(filter==='غير مقروءة'&&!n.read)||(filter==='مقروءة'&&n.read));
  const markAll=()=>{setRows(rows.map(n=>({...n,read:true})));notify('تم تحديث حالة القراءة محلياً فقط.')};
  return <div><PageHeading title="الإشعارات" subtitle="تنبيهات مرتبطة ببيانات العرض فقط" action={<button className="btn btn-soft btn-small" onClick={markAll} data-testid="button-mark-all-read"><CheckCheck size={14}/>قراءة الكل</button>}/>
    <div className="filter-row" style={{marginBottom:12}}>{['الكل','غير مقروءة','مقروءة'].map(x=><button className={`filter ${filter===x?'active':''}`} key={x} onClick={()=>setFilter(x)} data-testid={`notification-filter-${x}`}>{x}</button>)}</div>
    <div className="list">{visible.map(n=>(
      <button className="list-item" key={n.id} onClick={()=>setRows(rows.map(x=>x.id===n.id?{...x,read:true}:x))} data-testid={`notification-${n.id}`}>
        <div className="row"><span className="avatar gold">{n.kind==='evaluation'?<ClipboardCheck size={17}/>:n.kind==='session'?<CalendarDays size={17}/>:<Bell size={17}/>}</span>
          <div className="grow"><div className="row-between"><span className="card-title">{n.title}</span>{!n.read&&<span className="preview-dot" aria-label="غير مقروء"/>}</div>
            <div className="muted tiny" style={{marginTop:3,lineHeight:1.7}}>{n.body}</div><div className="eyebrow" style={{marginTop:5}}>{n.time}</div>
          </div>
        </div>
      </button>
    ))}
    {!visible.length&&<Empty title="لا إشعارات هنا" body="جرّب عرض جميع الإشعارات."/>}</div>
  </div>;
}
function SettingsScreen({notify,readOnly,setReadOnly}:{notify:(s:string)=>void;readOnly:boolean;setReadOnly:(b:boolean)=>void}) {
  const [email,setEmail]=useState('huda.demo@tabyan.local'); const [reminders,setReminders]=useState(true); const [quiet,setQuiet]=useState(false);
  const toggles=[['تذكير قبل الحلقة',reminders,setReminders],['إخفاء التنبيهات غير العاجلة',quiet,setQuiet]] as const;
  return <div><PageHeading title="الإعدادات" subtitle="تفضيلات محلية للمعاينة · لا يوجد حساب حقيقي"/>
    <div className="card"><div className="row"><span className="avatar"><UserRound size={18}/></span><div><div className="card-title">مسؤول تجريبي</div><div className="muted tiny">بيانات ملف تجريبي</div></div><span className="badge gold" style={{marginInlineStart:'auto'}}>معاينة</span></div><div className="divider"/>
      <label className="field-label" htmlFor="settings-email">البريد الظاهر في العرض</label><input id="settings-email" className="field" value={email} onChange={e=>setEmail(e.target.value)} dir="ltr" data-testid="input-settings-email"/>
      {toggles.map(([label,value,fn],i)=><div className="checkline" key={label}><span>{label}</span><button className={`switch ${value?'on':''}`} onClick={()=>fn(!value)} aria-label={label} data-testid={`toggle-setting-${i}`}><span/></button></div>)}
      <div className="checkline"><span>عرض مبسط للقراءة</span><button className={`switch ${readOnly?'on':''}`} onClick={()=>setReadOnly(!readOnly)} aria-label="عرض مبسط للقراءة" data-testid="toggle-readonly"><span/></button></div>
      <button className="btn btn-primary btn-block" style={{marginTop:13}} onClick={()=>notify('تم تطبيق التفضيلات محلياً لهذه الجلسة فقط.')} data-testid="button-save-settings">تطبيق التفضيلات محلياً</button>
    </div>
    <div className="card" style={{marginTop:10}}><div className="card-title">عن هذه المعاينة</div><p className="muted tiny" style={{lineHeight:1.8}}>البيانات والرسائل والحالات أمثلة توضيحية. لا تُنشأ حسابات، ولا تُرسل إشعارات، ولا تتصل هذه الواجهة ببيانات تبيان الحقيقية.</p><button className="btn btn-outline btn-small" onClick={()=>notify('TABYAN STAFF · نموذج واجهات محلي مستقل.')} data-testid="button-about-preview"><CircleHelp size={14}/>معلومات المعاينة</button></div>
  </div>;
}
function SupervisorHome() {
  const urgent=[{title:'مراجعة طلبات قبول المعلمين',count:'٢',href:'/supervisor/reviews',icon:<ShieldCheck size={18}/>},{title:'تقييمات بانتظار المراجعة',count:'٤',href:'/supervisor/reviews',icon:<ClipboardCheck size={18}/>},{title:'حلقات مجدولة اليوم',count:'٨',href:'/supervisor/sessions',icon:<CalendarDays size={18}/>},{title:'حسابات تحتاج متابعة',count:'٣',href:'/supervisor/users',icon:<Users size={18}/> }];
  return <div><div className="hero-panel" data-testid="supervisor-overview"><div className="eyebrow" style={{color:'#f1d27a'}}>نظرة إشرافية · بيانات محلية</div><h1 className="hero-title">السلام عليكم، أ. ناصر</h1><p className="muted" style={{margin:0}}>متابعة واضحة لمسارات التعلم اليوم.</p><StatGrid items={[{value:'١٢٤',label:'حساباً تجريبياً'},{value:'١٨',label:'معلمون'},{value:'٨',label:'حصص اليوم'},{value:'٤',label:'مراجعات معلقة'}]}/></div>
    <div className="section-head"><h2 className="section-heading" style={{margin:0}}>مؤشرات العمل</h2><span className="eyebrow">ملخص تجريبي</span></div>
    <div className="grid-2">{[{name:'متوسط تقييم الطلاب',v:'٨٧٫٤٪',hint:'ضمن النطاق المستقر',icon:<Star size={17}/>},{name:'حصص مكتملة هذا الشهر',v:'٢٨٦',hint:'من ٣٢١ موعداً',icon:<ChartNoAxesCombined size={17}/>}].map(x=><div className="card" key={x.name}><span style={{color:'#b8860b'}}>{x.icon}</span><div className="stat-value" style={{color:'#800020',marginTop:6}}>{x.v}</div><div className="card-title">{x.name}</div><div className="eyebrow">{x.hint}</div></div>)}</div>
    <div className="section-head"><h2 className="section-heading" style={{margin:0}}>عناصر المتابعة</h2><span className="badge gold">٤ عناصر</span></div>
    <div className="list">{urgent.map(x=><Link className="list-item" href={x.href} key={x.title} data-testid={`supervisor-urgent-${x.title}`}><div className="row"><span className="avatar gold">{x.icon}</span><span className="grow card-title">{x.title}</span><span className="badge red">{x.count}</span><ArrowLeft size={16}/></div></Link>)}</div>
    <div className="section-head"><h2 className="section-heading" style={{margin:0}}>الحلقات القادمة</h2><Link className="tiny" href="/supervisor/sessions">متابعة الكل ←</Link></div>
    <div className="card"><div className="row-between"><b>حلقة النور · حفظ قرآن</b><span className="badge green">جارية الآن</span></div><div className="muted tiny" style={{marginTop:5}}>ليان عبد الرحمن · أ. هدى السالم · ٥:٣٠ م</div><div className="divider"/><div className="row-between"><span className="tiny muted">حلقة الإتقان · تصحيح تلاوة</span><span className="badge gold">قادمة · ٦:٠٠ م</span></div></div>
  </div>;
}
function UsersScreen({onSelect}:{onSelect:(id:string)=>void}) {
  const [q,setQ]=useState(''); const [filter,setFilter]=useState('الكل');
  const visible=accounts.filter(x=>(`${x.name} ${x.phone}`.includes(q))&&(filter==='الكل'||x.role===filter));
  return <div><PageHeading title="إدارة الحسابات" subtitle="عرض تجريبي للأدوار والحالة · دون صلاحيات تشغيلية"/>
    <div className="search-wrap"><Search size={16}/><input className="field" value={q} onChange={e=>setQ(e.target.value)} placeholder="بحث بالاسم أو رقم الهاتف…" data-testid="input-account-search"/></div>
    <div className="filter-row" style={{margin:'10px 0 12px'}}>{['الكل','طالب','معلم','معلمة'].map(x=><button className={`filter ${filter===x?'active':''}`} key={x} onClick={()=>setFilter(x)} data-testid={`account-filter-${x}`}>{x}</button>)}</div>
    <div className="notice-inline" style={{marginBottom:12}}>الإجراءات أدناه للعرض فقط. لا يمكن إيقاف حساب أو إرسال رسالة حقيقية من هذه الواجهة.</div>
    <div className="list">{visible.map(x=><button className="list-item" key={x.id} onClick={()=>onSelect(x.id)} data-testid={`account-${x.id}`}><div className="row"><span className="avatar">{x.name[0]}</span><div className="grow"><div className="row-between"><span className="card-title">{x.name}</span><span className={`badge ${x.status==='نشط'?'green':'gold'}`}>{x.status}</span></div><div className="muted tiny">{x.role} · {x.detail}</div></div><ChevronLeft size={16}/></div></button>)}
    {!visible.length&&<Empty title="لا توجد حسابات مطابقة" body="جرّب مصطلح بحث آخر أو اختر دوراً مختلفاً."/>}</div>
  </div>;
}
function AccountDetail({id,notify}:{id:string;notify:(s:string)=>void}) {
  const user=accounts.find(x=>x.id===id)??accounts[0]; const [action,setAction]=useState('');
  return <div><Link href="/supervisor/users" className="tiny" style={{color:'#800020'}} data-testid="link-back-users"><ArrowRight size={14} style={{verticalAlign:'middle'}}/> قائمة الحسابات</Link><div className="card" style={{marginTop:12}}><div className="row"><span className="avatar" style={{width:56,height:56,fontSize:21}}>{user.name[0]}</span><div><h1 className="page-title" style={{fontSize:19}}>{user.name}</h1><div className="muted tiny">{user.role} · سجل تجريبي</div></div></div><div className="divider"/><div className="checkline"><span>الحالة</span><span className="badge green">{user.status}</span></div><div className="checkline"><span>رقم الهاتف</span><b>{user.phone}</b></div><div className="checkline"><span>ملخص الحساب</span><b>{user.detail}</b></div><div className="checkline"><span>تاريخ الإنشاء</span><b>١٢ صفر ١٤٤٦</b></div></div>
    <div className="section-head"><h2 className="section-heading" style={{margin:0}}>إجراءات تجريبية</h2></div><div className="grid-2"><button className="btn btn-outline" onClick={()=>setAction(action==='message'?'':'message')} data-testid="button-account-message"><MessageCircle size={15}/>رسالة داخلية</button><button className="btn btn-outline" onClick={()=>setAction(action==='warning'?'':'warning')} data-testid="button-account-warning"><CircleHelp size={15}/>ملاحظة متابعة</button></div>
    {action&&<div className="card" style={{marginTop:10}}><label className="field-label">نص {action==='message'?'الرسالة التجريبية':'ملاحظة المتابعة'}</label><textarea className="textarea" placeholder="اكتب نصاً للاطلاع فقط…" data-testid="input-account-action"/><button className="btn btn-gold btn-block" style={{marginTop:8}} onClick={()=>{notify('هذا الإجراء تجريبي فقط ولم يُرسل.');setAction('')}} data-testid="button-account-action-confirm">تأكيد محلي فقط</button></div>}
    <div className="notice-inline" style={{marginTop:12}}>تفاصيل الاتصال والبيانات أعلاه خيالية ومخصصة لعرض واجهة الإشراف.</div>
  </div>;
}
function SupervisorSchedules({notify}:{notify:(s:string)=>void}) {
  const [tab,setTab]=useState('الجداول'); const [day,setDay]=useState('الكل'); const [query,setQuery]=useState('');
  const schedules=[
    {id:'sc1',teacher:'أ. هدى السالم',program:'حفظ قرآن',mode:'فردية',days:['الأحد','الأربعاء'],time:'٥:٣٠ م – ٦:٠٠ م',count:5},
    {id:'sc2',teacher:'أ. ناصر العتيبي',program:'مراجعة قرآن',mode:'جماعية · حتى ٤',days:['الاثنين','الخميس'],time:'٦:٠٠ م – ٦:٣٠ م',count:8},
    {id:'sc3',teacher:'أ. ريم الحربي',program:'تصحيح تلاوة',mode:'فردية',days:['الثلاثاء'],time:'٤:٣٠ م – ٥:٠٠ م',count:3},
  ];
  const rows=schedules.filter(x=>(day==='الكل'||x.days.includes(day))&&`${x.teacher} ${x.program}`.includes(query));
  return <div><PageHeading title="الجداول والحجوزات" subtitle="استعراض الجداول الأسبوعية والحجوزات التجريبية" action={<button className="btn btn-primary btn-small" onClick={()=>notify('إنشاء الجدول غير مفعّل؛ العرض للقراءة والتصفية فقط.')} data-testid="button-create-schedule"><span style={{fontSize:17}}>＋</span>جدول تجريبي</button>}/>
    <div className="tabs">{['الجداول','الحجوزات'].map(x=><button className={tab===x?'active':''} key={x} onClick={()=>setTab(x)} data-testid={`supervisor-schedule-tab-${x}`}>{x}</button>)}</div>
    <div className="search-wrap" style={{marginTop:10}}><Search size={16}/><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم المعلم أو المسار…" data-testid="input-schedule-search"/></div>
    <div className="filter-row" style={{margin:'9px 0 12px'}}>{['الكل','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس'].map(x=><button className={`filter ${day===x?'active':''}`} key={x} onClick={()=>setDay(x)} data-testid={`supervisor-schedule-day-${x}`}>{x}</button>)}</div>
    {tab==='الجداول'?<div className="list">{rows.map(s=><div className="card" key={s.id} data-testid={`schedule-record-${s.id}`}><div className="row-between"><span className="card-title">{s.program}</span><span className="badge gold">{s.mode}</span></div><div className="muted tiny" style={{marginTop:4}}>{s.teacher} · {s.count} طلاب</div><div className="divider"/><div className="row-between tiny"><span>{s.days.join('، ')}</span><b dir="ltr">{s.time}</b></div></div>)}</div>:<div className="list">{sessions.map(s=><div className="card" key={s.id}><div className="row-between"><b>{s.student}</b><span className="badge soft">{s.state}</span></div><div className="muted tiny">{s.type} · {s.teacher} · {s.day} {s.time}</div></div>)}</div>}
  </div>;
}
function SupervisorSessions({notify}:{notify:(s:string)=>void}) {
  const [filter,setFilter]=useState('الكل'); const [query,setQuery]=useState('');
  const rows=sessions.filter(s=>(filter==='الكل'||(filter==='جارية الآن'?s.id==='h1':s.state==='قادمة'))&&`${s.student} ${s.teacher} ${s.type}`.includes(query));
  return <div><PageHeading title="متابعة الحلقات" subtitle="جارية الآن والقادمة · بيانات المثال لا تتحدث تلقائياً"/>
    <div className="grid-2" style={{marginBottom:12}}><div className="card"><div className="eyebrow">جارية الآن</div><div className="stat-value" style={{color:'#800020'}}>١</div></div><div className="card"><div className="eyebrow">قادمة اليوم</div><div className="stat-value" style={{color:'#800020'}}>٣</div></div></div>
    <div className="search-wrap"><Search size={16}/><input className="field" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث باسم الطالب أو المعلم…" data-testid="input-session-search"/></div>
    <div className="filter-row" style={{margin:'10px 0'}}>{['الكل','جارية الآن','قادمة'].map(x=><button className={`filter ${filter===x?'active':''}`} key={x} onClick={()=>setFilter(x)} data-testid={`session-filter-${x}`}>{x}</button>)}</div>
    <div className="list">{rows.map(s=><div className="card" key={s.id} data-testid={`monitored-session-${s.id}`}><div className="row-between"><span className="card-title">{s.type}</span><span className={`badge ${s.id==='h1'?'green':'gold'}`}>{s.id==='h1'?'جارية الآن':s.state}</span></div><div className="muted tiny" style={{marginTop:5}}>{s.topic}</div><div className="row-between tiny" style={{marginTop:8}}><span>{s.student}</span><span>{s.teacher}</span></div><div className="row-between tiny muted" style={{marginTop:5}}><span>{s.day} · {s.time}</span><button className="btn btn-soft btn-small" onClick={()=>notify('عرض تفاصيل المراقبة توضيحي فقط؛ لا يوجد بث حي.')} data-testid={`button-monitor-${s.id}`}><Video size={13}/>تفاصيل</button></div></div>)}{!rows.length&&<Empty title="لا توجد حلقات مطابقة" body="غيّر عوامل البحث أو التصفية."/>}</div>
  </div>;
}
function Reviews({notify}:{notify:(s:string)=>void}) {
  const [tab,setTab]=useState('اختبارات الطلاب'); const [status,setStatus]=useState('المعلّقة');
  const types=['اختبارات الطلاب','قبول المعلمين','تقييمات الطلاب'];
  const fixtures=[
    {name:'طلب تحديد مستوى · جود السبيعي',type:'اختبارات الطلاب',age:'منذ ١١ ساعة',detail:'القرآن الكريم · تسجيل تجريبي'},
    {name:'طلب انضمام · أ. ريم الحربي',type:'قبول المعلمين',age:'منذ ١٨ ساعة',detail:'تخصص التجويد · ملف تجريبي'},
    {name:'تقييم حصة · يوسف خالد',type:'تقييمات الطلاب',age:'منذ يوم',detail:'حفظ قرآن · يحتاج مراجعة إشرافية'},
    {name:'طلب تحديد مستوى · راشد فواز',type:'اختبارات الطلاب',age:'منذ يومين',detail:'تصحيح التلاوة · تسجيل تجريبي'},
  ];
  const shown=fixtures.filter(x=>x.type===tab&&(status==='المعلّقة'||x.age==='منذ يوم'));
  return <div><PageHeading title="المراجعات" subtitle="قوائم متابعة تعليمية تجريبية · لا توجد قرارات فعلية"/>
    <div className="tabs">{types.map(x=><button className={tab===x?'active':''} key={x} onClick={()=>setTab(x)} data-testid={`review-tab-${x}`}>{x}</button>)}</div>
    <div className="filter-row" style={{margin:'10px 0 12px'}}>{['المعلّقة','كل الطلبات'].map(x=><button className={`filter ${status===x?'active':''}`} key={x} onClick={()=>setStatus(x)} data-testid={`review-filter-${x}`}>{x}</button>)}</div>
    <div className="notice-inline" style={{marginBottom:11}}>المراجعة الفعلية والتواصل والقرارات غير متاحة في هذه المعاينة.</div>
    <div className="list">{shown.map((x,i)=><div className="card" key={`${x.name}${i}`} data-testid={`review-card-${i}`}><div className="row-between"><span className="card-title">{x.name}</span><span className="badge gold">{status==='المعلّقة'?'معلّق':'للاطلاع'}</span></div><div className="muted tiny" style={{marginTop:4}}>{x.detail}</div><div className="row-between" style={{marginTop:10}}><span className="eyebrow">{x.age}</span><button className="btn btn-primary btn-small" onClick={()=>notify('فتح تفاصيل الطلب التجريبي — لا قرار يُعتمد من هنا.')} data-testid={`button-review-${i}`}>عرض الطلب <ArrowLeft size={13}/></button></div></div>)}{!shown.length&&<Empty title="لا توجد طلبات في هذا القسم" body="ستظهر العناصر التجريبية بعد تغيير التصفية."/>}</div>
  </div>;
}
function Empty({title,body}:{title:string;body:string}) {
  return <div className="empty" data-testid="empty-state"><div className="empty-mark"><BookOpen size={18}/></div><div className="card-title">{title}</div><div className="muted tiny" style={{marginTop:4}}>{body}</div></div>;
}
function NotFound() {
  return <div className="empty"><div className="empty-mark"><CircleHelp size={18}/></div><div className="card-title">الصفحة غير موجودة</div><p className="muted tiny">اختر إحدى مساحات العمل للعودة إلى المعاينة.</p><Link className="btn btn-primary btn-small" href="/">العودة للبداية</Link></div>;
}

export default App;
