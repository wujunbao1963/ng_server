const webpush = require('web-push');

// Railway 上的 VAPID 配置
const VAPID_PUBLIC_KEY = 'BGXf60FUBpCx3vc0IMqcQa2xkhJ1X1SFauvgeVMHUIdP6-yLvT65WBZ_lYNOOjBXlRKoT9-WJ4WbypOooHNFfNQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY; // 需要从 Railway 获取
const VAPID_SUBJECT = 'mailto:admin@neighbor-guard.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// 从数据库获取的订阅 token（需要你查询）
const subscription = JSON.parse(process.argv[2]);

const payload = JSON.stringify({
  title: '🔔 测试推送',
  body: '如果你看到这条消息，推送成功！',
  data: { test: true }
});

console.log('Sending to:', subscription.endpoint.slice(-30));

webpush.sendNotification(subscription, payload)
  .then(res => console.log('✅ Success:', res.statusCode))
  .catch(err => console.error('❌ Failed:', err.statusCode, err.body));
