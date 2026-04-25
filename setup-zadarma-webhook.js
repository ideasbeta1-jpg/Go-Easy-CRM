const { api } = require("zadarma");

process.env.ZADARMA_USER_KEY = '32d93d805cab051fd086';
process.env.ZADARMA_SECRET_KEY = '1ff9ee4c1799f5c3e9a1';

(async () => {
    try {
        console.log('🔍 Chequeando estado del PBX...');

        let pbxStatus = await api({api_method: '/v1/pbx/internal/'});
        console.log('📱 Extensiones PBX:', JSON.stringify(pbxStatus, null, 2));

    } catch (e) {
        console.error('❌ Error de API:', e);
    }
})();
