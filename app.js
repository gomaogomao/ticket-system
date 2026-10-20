
const f = document.getElementById('f');
const btn = document.getElementById('btn');
const msg = document.getElementById('msg');

f.addEventListener('submit', function(e) {
  e.preventDefault();

  const data = new FormData(f);
  const quantity = Number(data.get('quantity'));

  if (!Number.isInteger(quantity) ||
      quantity < 25 || quantity > 1000) {
    showError('枚数は25〜1,000枚で入力してください。');
    return;
  }

  const url = window.TICKET_CONFIG?.GAS_API_URL;

  if (!url || url.includes('PASTE_YOUR')) {
    showError('GASのURLが設定されていません。');
    return;
  }

  const payload = {
    action: 'submitOrder',
    payload: {
      name: data.get('name'),
      email: data.get('email'),
      company: data.get('company'),
      quantity: quantity,
      memo: data.get('memo')
    }
  };

  const iframeName = 'gasSubmitFrame';

  let iframe = document.getElementById(iframeName);

  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeName;
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = url;
  form.target = iframeName;
  form.style.display = 'none';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'payload';
  input.value = JSON.stringify(payload);

  form.appendChild(input);
  document.body.appendChild(form);

  form.submit();
  form.remove();

  btn.textContent = '送信しました（確認中）';
  btn.disabled = true;

  msg.hidden = false;
  msg.className = 'message';
  msg.textContent =
    '送信処理を行いました。現在、申込の登録結果を確認中です。';
});

function showError(message) {
  msg.hidden = false;
  msg.className = 'message error';
  msg.textContent = 'エラー：' + message;
}
