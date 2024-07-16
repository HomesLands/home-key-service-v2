export default () => {
    return {
        vnpTmnCode: process.env.VNP_TMNCODE,
        vnpHashSecret: process.env.VNP_HASHSECRET,
        vnpUrl: process.env.VNP_URL,
        vnpReturnUrl: process.env.VNP_RETURN_URL,
    }
}