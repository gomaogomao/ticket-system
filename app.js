const f = document.getElementById('f');
const btn = document.getElementById('btn');
const msg = document.getElementById('msg');
let busy = false;

function showMessage(text, error = false) {
  msg.hidden = false;
  msg.className = error ? 'message error' : 'message';
  msg.textContent = text;
}

function checkStatus(url, requestId) {
  return new Promise((resolve, reject) => {
    const callback = 'daznCb_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    let done = false;
    const finish = (error, data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      delete window[callback];
      script.remove();
      error ? reject(error) : resolve(data);
    };
    window[callback] = data => finish(null, data);
    script.onerror = () => finish(new Error('確認通信に失敗しました'));
    const timer = setTimeout(() => finish(new Error('確認がタイムアウトしました')), 10000);
    script.src = url + (url.includes('?') ? '&' : '?') +
      new URLSearchParams({action:'status',requestId,callback}).toString();
    document.head.appendChild(script);
  });
}

f.addEventListener('submit', async function (e) {
  e.preventDefault();
  if (busy) return;
  const data = new FormData(f);
  const quantity = Number(data.get('quantity'));
  if (!Number.isInteger(quantity) || quantity < 25 || quantity > 1000) {
    showMessage('数量は25〜1,000件で入力してください。', true); return;
  }
  const url = window.TICKET_CONFIG?.GAS_API_URL;
  if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
    showMessage('GASのURLを確認してください。', true); return;
  }
  if (!crypto.randomUUID) {
    showMessage('ブラウザが対応していません。最新版をご利用ください。', true); return;
  }
  const requestId = crypto.randomUUID();
  const payload = {action:'submitOrder',requestId,payload:{
    name:data.get('name'),email:data.get('email'),company:data.get('company'),
    quantity,memo:data.get('memo')
  }};
  busy = true;
  btn.disabled = true;
  btn.textContent = '申込内容を確認しています…';
  showMessage('申込を送信しています。画面を閉じずにお待ちください。');
  const iframe = document.createElement('iframe');
  iframe.name = 'daznFrame_' + Date.now();
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const post = document.createElement('form');
  post.method = 'POST'; post.action = url; post.target = iframe.name;
  post.style.display = 'none';
  const hidden = document.createElement('input');
  hidden.type = 'hidden'; hidden.name = 'payload'; hidden.value = JSON.stringify(payload);
  post.appendChild(hidden); document.body.appendChild(post);
  post.submit(); post.remove();
  try {
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2500));
      let status;
      try { status = await checkStatus(url, requestId); }
      catch (err) { continue; }
      if (status.status === 'SUCCESS') {
        showMessage('お申し込みが完了しました！\n申込番号：' + status.orderId +
          '\n数量：' + quantity + '件\n受付メールをご確認ください。');
        btn.textContent = '申込完了';
        return;
      }
      if (status.status === 'ERROR') {
        showMessage('申込を登録できませんでした：' + (status.error || '詳細不明'), true);
        btn.textContent = '再度申し込む'; btn.disabled = false; busy = false;
        return;
      }
    }
    showMessage('登録結果を確認できませんでした。Ordersシートまたは受付メールを確認してください。重複を防ぐため、すぐに再送信しないでください。', true);
    btn.textContent = '確認が必要です';
  } finally {
    setTimeout(() => iframe.remove(), 1000);
  }
});
