"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NgDevice = void 0;
const common_1 = require("@nestjs/common");
exports.NgDevice = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.ngDevice ?? null;
});
//# sourceMappingURL=ng-device.decorator.js.map