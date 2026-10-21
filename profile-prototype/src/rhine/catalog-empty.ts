import './style.css';
import {paintTheme} from './theme-ui';
import {refreshCatalog,records} from './data';
import {catalogToolbar,initCatalogEditor,consumeCatalogReturn} from './catalog-editor';
consumeCatalogReturn();
try{paintTheme(JSON.parse(localStorage.getItem('rhine-settings')||'{}').colorTheme==='dark'?1:0);}catch{}
document.documentElement.dataset.inputMethod='pointer';
const events=new AbortController();
document.addEventListener('pointerdown',()=>{document.documentElement.dataset.inputMethod='pointer';},{signal:events.signal});
document.addEventListener('keydown',()=>{document.documentElement.dataset.inputMethod='keyboard';},{signal:events.signal});
document.querySelector('#root')!.innerHTML=`<main class="catalog-empty-page"><header>教官大队 / 档案目录</header><h1>档案目录为空</h1><p>新增一份档案开始填写，也可以撤销上次删除。</p>${catalogToolbar()}</main>`;
const dispose=initCatalogEditor(async id=>{
 refreshCatalog();if(!records.length)return;
 dispose();events.abort();
 sessionStorage.setItem('corps-catalog-return',JSON.stringify({id}));
 const url=new URL(location.href);url.searchParams.set('scene','archive');history.replaceState(null,'',url);
 document.querySelector('#root')!.innerHTML='<main id="viewport"><div id="stage"></div></main>';
 await import('./main');
});
