import { Router } from 'express';
export function createHealthRouter() {
    const router = Router();
    router.get('/', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'nodash-analytics-server'
        });
    });
    return router;
}
//# sourceMappingURL=health.js.map