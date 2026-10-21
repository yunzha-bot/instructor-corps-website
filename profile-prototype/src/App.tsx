import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, ArrowsOut, Check, FileText, LockKey, Pause, UserCircle, X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { destinations, initialProfile, metadata, readProfile, saveProfile, type Profile } from './data';
import { ArchiveScene, type ArchiveSnapshot } from './motion/archive-scene';
declare global { interface Window { __archiveScene?: ArchiveScene } }

type Tab = '基本资料' | '训练记录' | '个人荣誉';
const tabs: Tab[] = ['基本资料', '训练记录', '个人荣誉'];
const motionQuery = '(prefers-reduced-motion: reduce)';
const ease = 'cubic-bezier(.22,1,.36,1)';
function Reveal({ children }: { children: ReactNode }) {
  return <span className="reveal-item">{children}<span className="reveal-cover" aria-hidden="true" /></span>;
}

export function App() {
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [tab, setTab] = useState<Tab>('基本资料');
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [opened, setOpened] = useState(false);
  const [category, setCategory] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia(motionQuery).matches);
  const [dialog, setDialog] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Profile>(profile);
  const [saveError, setSaveError] = useState('');
  const world = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<ArchiveScene | null>(null);
  const lastStage = useRef('archive');
  const content = useRef<HTMLElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  function finishMotion() { scene.current?.skip(); setBusy(false); }

  useEffect(() => {
    const media = matchMedia(motionQuery);
    const changed = () => setReduced(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);

  useEffect(() => {
    if (!world.current || !content.current) return;
    let instance: ArchiveScene | null = null;
    const update = (frame: ArchiveSnapshot) => {
      if (!root.current || !content.current) return;
      root.current.dataset.stage = frame.mode;
      root.current.dataset.scan = frame.scan;
      if(frame.mode==='opening'&&lastStage.current!=='opening')setTab(tabs[frame.category]);
      lastStage.current=frame.mode;
      content.current.style.opacity = String(Math.max(0, Math.min(1, (frame.detail - .03) / .32)));
      content.current.setAttribute('aria-hidden', String(frame.mode === 'archive'));
      setOpened(frame.mode !== 'archive');
      setCategory(frame.category);
      setBusy(frame.mode === 'opening' || frame.mode === 'returning');
    };
    try {
      instance = new ArchiveScene(world.current, content.current, update, () => setLoaded(true), () => {setImageError(true);setLoaded(true);});
      scene.current = instance; window.__archiveScene = instance;
    } catch { setImageError(true);setLoaded(true); }
    return () => { instance?.dispose();scene.current=null;delete window.__archiveScene; };
  }, []);
  useEffect(() => { scene.current?.setReduced(reduced); }, [reduced, loaded]);

  useEffect(() => {
    const panel = modal.current;
    if (dialog && panel && !panel.open) panel.showModal();
    if (!dialog && panel?.open) panel.close();
  }, [dialog]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  function openDialog(name: string) {
    finishMotion();
    if (name === '编辑资料') { setDraft(profile); setSaveError(''); }
    setDialog(name);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const next = { nickname: draft.nickname.trim(), bio: draft.bio.trim() };
    if (!next.nickname || next.nickname.length > 24 || next.bio.length > 300) { setSaveError('请填写24字以内的展示昵称，简介限300字。'); return; }
    try { saveProfile(next); setProfile(next); setDialog(null); setNotice('演示资料已保存到此浏览器。'); }
    catch { setSaveError('浏览器存储不可用，资料尚未保存。请保留输入后重试。'); }
  }
  function changeTab(next: Tab) { finishMotion(); setTab(next); }

  return <div className="app-shell" ref={root} data-motion={busy ? 'playing' : 'ready'} data-reduced={reduced}>
    <a className="skip-link" href="#profile-content">跳到个人档案</a>
    <header className="site-header">
      <button className="wordmark" onClick={() => openDialog('官网')}>教官大队</button>
      <nav aria-label="队员中心导航">
        <button className="nav-active" aria-current="page" onClick={() => { setDialog(null); changeTab('基本资料'); }}>我的档案</button>
        {['成长历程', '我的学习', '课程中心', '心理支持'].map(name => <button key={name} onClick={() => openDialog(name)}>{name}</button>)}
      </nav>
      <div className="header-account"><button className="back-home" onClick={() => openDialog('官网')}>返回官网 <ArrowUpRight /></button><button className="account-button" onClick={() => openDialog('原型说明')}><span>{profile.nickname}</span><UserCircle size={24} /></button></div>
    </header>
    <div className="archive-world" ref={world} />
    <section className="archive-index" aria-label="本人档案入口" aria-hidden={opened}>
      <p className="eyebrow">PERSONAL ARCHIVE / 本人档案</p><h1>{profile.nickname}</h1>
      <p className="archive-category">{tabs[category]}</p>
      <button className="archive-access" disabled={!loaded || imageError} onClick={() => scene.current?.open()}>{loaded ? '读取档案' : '准备影像'}<ArrowRight size={24} /></button>
      <div className="archive-selection"><button aria-label="上一类档案" onClick={() => {const next=(category+2)%3;setCategory(next);scene.current?.select(next);}}><ArrowLeft /></button><span>0{category+1} / 03</span><button aria-label="下一类档案" onClick={() => {const next=(category+1)%3;setCategory(next);scene.current?.select(next);}}><ArrowRight /></button></div>
      {imageError && <p role="alert">三维影像加载失败，请刷新或检查浏览器 WebGL 支持。</p>}
    </section>
    <main className="profile-layout" id="profile-content">
      <section className="portrait-section" aria-label="本人影像">
        <div className="portrait-topline"><button className="text-button" onClick={() => scene.current?.close()}><ArrowLeft /> 返回档案</button><button className="image-expand" onClick={() => openDialog('影像')} aria-label="放大本人示意影像"><ArrowsOut /></button></div>
        <div className="portrait-reserved" aria-hidden="true" /><span className="portrait-label">个人影像 / AI示意人物</span>
      </section>
      <article className="profile-document" ref={content}>
        <div className="document-eyebrow"><span>MY PROFILE</span><span className="privacy"><LockKey weight="fill" /> 仅本人可见</span></div>
        <h1><Reveal>{profile.nickname}</Reveal></h1><p className="document-subtitle"><Reveal>个人档案</Reveal></p>
        <dl className="metadata">{metadata.map(([label, value]) => <div key={label}><dt>{label}：</dt><dd><Reveal>{value}</Reveal></dd></div>)}</dl>
        <div className="tabs" role="tablist" aria-label="档案内容">{tabs.map((name, index) => <button key={name} id={`tab-${index}`} role="tab" aria-selected={tab === name} aria-controls="archive-panel" tabIndex={tab === name ? 0 : -1} className={tab === name ? 'selected' : ''} onClick={() => changeTab(name)} onKeyDown={event => {
          let target: number | null = null;
          if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
          if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
          if (event.key === 'Home') target = 0;
          if (event.key === 'End') target = tabs.length - 1;
          if (target !== null) { event.preventDefault(); changeTab(tabs[target]); document.getElementById(`tab-${target}`)?.focus(); }
        }}>{name}</button>)}</div>
        <div key={tab} className="tab-panel" id="archive-panel" role="tabpanel" aria-labelledby={`tab-${tabs.indexOf(tab)}`} tabIndex={0}>
          <h2><Reveal>{tab === '基本资料' ? '个人简介' : tab}</Reveal></h2>
          {tab === '基本资料' && profile.bio ? <p className="bio-text">{profile.bio}</p> : <div className="empty-state"><FileText size={46} weight="thin" /><p><Reveal>{tab === '基本资料' ? '尚未填写个人简介。' : tab === '训练记录' ? '尚无已登记训练记录。' : '尚无已登记荣誉。'}</Reveal></p></div>}
        </div>
        <button className="growth-row" onClick={() => openDialog('成长历程')}><strong>成长历程</strong><span>查看本人训练与阶段记录</span><ArrowRight size={22} /></button>
        <div className="document-actions"><button className="primary-button" onClick={() => openDialog('编辑资料')}>编辑资料</button><button className="secondary-button" onClick={() => openDialog('成长历程')}>查看成长记录 <ArrowUpRight size={21} /></button></div>
      </article>
    </main>
    <footer className="site-footer"><div className="motion-tools"><button onClick={() => scene.current?.replay()} disabled={!loaded || imageError || reduced}><ArrowCounterClockwise /> 重播动效</button>{busy && <button onClick={finishMotion}><Pause /> 跳过</button>}<label><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />减少动态</label></div><button onClick={() => openDialog('原型说明')}>交互原型 · AI示意人物 · 非真实资料</button></footer>
    <p className="live-notice" role="status" aria-live="polite">{notice}</p>
    <dialog ref={modal} aria-label={dialog || '档案操作'} className={dialog === '影像' ? 'modal image-modal' : 'modal'} onCancel={() => setDialog(null)} onClose={() => setDialog(null)} onClick={event => { if (event.target === event.currentTarget) setDialog(null); }}>
      <div className="modal-inner"><button className="modal-close" aria-label="关闭" onClick={() => setDialog(null)}><X size={24} /></button>
      {dialog === '编辑资料' ? <form onSubmit={submit}>
        <p className="eyebrow">EDIT PROFILE</p><h2>编辑个人资料</h2><p className="form-note">仅使用虚构信息。保存到此浏览器，可随时重置。</p>
        <label className="field">展示昵称<input autoFocus required maxLength={24} value={draft.nickname} onChange={event => setDraft({ ...draft, nickname: event.target.value })} /></label>
        <label className="field">个人简介<textarea rows={5} maxLength={300} value={draft.bio} onChange={event => setDraft({ ...draft, bio: event.target.value })} placeholder="填写虚构简介以体验编辑功能" /><span className="field-hint">{draft.bio.length} / 300</span></label>
        <p className="form-note">届别、分队、加入时间和队内身份由获授权人员维护。</p>{saveError && <p role="alert" className="form-error">{saveError}</p>}
        <div className="form-actions"><button type="button" className="text-button" onClick={() => setDialog(null)}>取消</button><button className="primary-button" type="submit">保存演示资料 <Check /></button></div>
      </form> : dialog === '影像' ? <><img src="/assets/member-archive.png" alt="本人档案板放大示意" /><p>AI示意人物 · 非真实队员</p></> : dialog === '原型说明' ? <>
        <p className="eyebrow">PROTOTYPE / 01</p><h2>个人档案动效原型</h2><p>保留选定方案的构图与颜色。RhineLabUI 仅作为档案抽取、内容揭示与归位节奏的参考。</p><p>目前可编辑虚构昵称和简介、切换页签、放大影像、重播或跳过动效。其他工作区尚未开发，当前未连接真实认证与数据库。</p><p>“仅本人可见”为正式系统的权限设计目标，演示页面不提供真实隐私保障，请勿输入真实敏感资料。</p><button className="reset-button" onClick={() => { try { saveProfile(initialProfile); setProfile(initialProfile); setDialog(null); setNotice('已重置演示资料。'); } catch { setNotice('浏览器存储不可用，重置未保存。'); } }}>重置演示资料 <ArrowCounterClockwise /></button>
      </> : dialog && destinations[dialog] ? <><p className="eyebrow">{dialog === '官网' ? 'PUBLIC WEBSITE' : 'MEMBER WORKSPACE'}</p><h2>{dialog}</h2><h3>{destinations[dialog].intro}</h3><p>{destinations[dialog].note}</p><div className="boundary-note">这是当前档案原型的栏目说明，完整页面尚未开发。</div><button className="primary-button" onClick={() => setDialog(null)}>返回个人档案 <ArrowLeft /></button></> : null}
      </div>
    </dialog>
  </div>;
}
