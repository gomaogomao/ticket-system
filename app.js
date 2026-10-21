// DAZN販売コード申込フォーム: iframe + postMessage による完了通知
const f = document.getElementById('f');
const btn = document.getElementById('btn');
const msg = document.getElementById('msg');
let pending = null;

function showMessage(text, isError) {
  msg.hidden = false;
  msg.className = isError ? 'message error' : 'message';
  msg.textContent = text;
}

function finishRequest() {
  if (!pending) return;
  clearTimeout(pending.timeout);
  pending = null;
  btn.disabled = false;
  btn.textContent = '申し込む';
}

window.addEventListener('message', function(event) {
  if (!pending) return;
  // 送信先 iframe 自身からの応答のみを受け取る
  if (event.source !== pending.iframe.contentWindow) return;
  // GASの応答は script.googleusercontent.com などから届く
  if (!/^https:\/\/(?:script\.google\.com|(?:[a-z0-9-]+\.)*googleusercontent\.com)$/.test(event.origin)) return;
  const data = event.data;
  if (!data || data.type !== 'DAZN_ORDER_RESULT' || data.requestId !== pending.id) return;
  const result = data.result || {};
  finishRequest();
  if (result.ok) {
    showMessage('お申し込みが完了しました！\n申込番号：' + result.orderId +
      '\n申込数量：' + dataQuantity + '件\n受付メールをご確認ください。', false);
    f.reset();
  } else {
    showMessage('エラー：' + (result.error || '登録できませんでした。'), true);
  }
});

let dataQuantity = 0;
f.addEventListener('submit', function(e) {
  e.preventDefault();
  if (pending) return;
  const data = new FormData(f);
  const quantity = Number(data.get('quantity'));
  if (!Number.isInteger(quantity) || quantity < 25 || quantity > 1000) {
    showMessage('枚数は25〜1,000件の整数で入力してください。', true);
    return;
  }
  const url = window.TICKET_CONFIG && window.TICKET_CONFIG.GAS_API_URL;
  if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
    showMessage('GASのURLをconfig.jsに正しく設定してください。', true);
    return;
  }
  const payload = {action:'submitOrder',payload:{
    name:data.get('name'),email:data.get('email'),company:data.get('company'),
    quantity:quantity,memo:data.get('memo')
  }};
  const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
    String(Date.now()) + '-' + Math.random().toString(36).slice(2);
  let iframe = document.getElementById('gasSubmitFrame');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'gasSubmitFrame';
    iframe.name = 'gasSubmitFrame';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  const postForm = document.createElement('form');
  postForm.method = 'POST';
  postForm.action = url;
  postForm.target = 'gasSubmitFrame';
  postForm.style.display = 'none';
  for (const [key,value] of Object.entries({payload:JSON.stringify(payload),requestId:id})) {
    const input = document.createElement('input');
    input.type = 'hidden';input.name = key;input.value = value;
    postForm.appendChild(input);
  }
  document.body.appendChild(postForm);
  dataQuantity = quantity;
  btn.disabled = true;
  btn.textContent = '送信中…';
  showMessage('申込結果を確認しています。しばらくお待ちください。', false);
  const timeout = setTimeout(function() {
    if (!pending || pending.id !== id) return;
    finishRequest();
    showMessage('結果を確認できませんでした。注文が登録されている可能性があります。再送せず、受付メールまたは管理者にご確認ください。', true);
  }, 45000);
  pending = {id:id,iframe:iframe,timeout:timeout};
  postForm.submit();
  postForm.remove();
});
