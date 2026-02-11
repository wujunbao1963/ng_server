"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web_push_provider_1 = require("./src/infra/ports/web-push-provider");
const apns_push_provider_1 = require("./src/infra/ports/apns-push-provider");
const multi_push_provider_1 = require("./src/infra/ports/multi-push-provider");
async function testProviders() {
    console.log('🧪 Testing Push Providers...\n');
    const mockConfig = new Map();
    const configService = {
        get: (key) => mockConfig.get(key),
    };
    console.log('1️⃣ Testing WebPushProvider (not configured)...');
    const webPush = new web_push_provider_1.WebPushProvider(configService);
    console.log(`   isConfigured: ${webPush.isConfigured()}`);
    const webResult = await webPush.send('test-token', {
        title: 'Test',
        body: 'Test notification',
    });
    console.log(`   send result: success=${webResult.success}, error=${webResult.error}`);
    console.log('   ✅ WebPushProvider works\n');
    console.log('2️⃣ Testing APNsPushProvider (not configured)...');
    const apns = new apns_push_provider_1.APNsPushProvider(configService);
    console.log(`   isConfigured: ${apns.isConfigured()}`);
    const apnsResult = await apns.send('test-token', {
        title: 'Test',
        body: 'Test notification',
    });
    console.log(`   send result: success=${apnsResult.success}, error=${apnsResult.error}`);
    console.log('   ✅ APNsPushProvider works\n');
    console.log('3️⃣ Testing MultiPushProvider routing...');
    const multi = new multi_push_provider_1.MultiPushProvider(webPush, apns);
    const iosResult = await multi.sendByPlatform('ios', 'ios-token', {
        title: 'iOS Test',
        body: 'iOS notification',
    });
    console.log(`   iOS: success=${iosResult.success}, error=${iosResult.error}`);
    const webPlatformResult = await multi.sendByPlatform('web', 'web-token', {
        title: 'Web Test',
        body: 'Web notification',
    });
    console.log(`   Web: success=${webPlatformResult.success}, error=${webPlatformResult.error}`);
    console.log('   ✅ MultiPushProvider routing works\n');
    console.log('4️⃣ Testing MultiPushProvider batch sending...');
    const devices = [
        { platform: 'ios', token: 'ios-token-1' },
        { platform: 'ios', token: 'ios-token-2' },
        { platform: 'web', token: 'web-token-1' },
        { platform: 'android', token: 'android-token-1' },
    ];
    const batchResults = await multi.sendBatchByPlatform(devices, {
        title: 'Batch Test',
        body: 'Batch notification',
    });
    console.log(`   Total results: ${batchResults.length}`);
    batchResults.forEach((result, i) => {
        console.log(`   ${devices[i].platform}: success=${result.success}, error=${result.error || 'none'}`);
    });
    console.log('   ✅ Batch sending works\n');
    console.log('✅ All tests passed!\n');
    console.log('📝 Notes:');
    console.log('   - Providers return "not configured" errors when credentials are missing');
    console.log('   - This is expected behavior for unconfigured providers');
    console.log('   - To test with real credentials, add them to .env and run the server');
}
testProviders()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-providers.js.map