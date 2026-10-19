// Shared page furniture: the yellow circle wipe that carries you between pages, and the toast.
// The wipe starts closed when the page you came from asked for it, so the circle opens on arrival.
const COVER = "try{if(sessionStorage.getItem('gitroom-wipe')){sessionStorage.removeItem('gitroom-wipe');document.getElementById('wipe').classList.add('cover')}}catch(e){}";

export default function Chrome() {
  return (
    <>
      <div id="wipe" aria-hidden="true" suppressHydrationWarning />
      <script dangerouslySetInnerHTML={{ __html: COVER }} />
      <div id="toast" role="status" />
    </>
  );
}
