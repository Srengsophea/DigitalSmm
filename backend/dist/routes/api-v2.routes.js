"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_v2_controller_1 = require("../controllers/api-v2.controller");
const router = (0, express_1.Router)();
// Standard SMM API v2 handles both POST and GET
router.post('/', api_v2_controller_1.ApiV2Controller.handleApiV2);
router.get('/', api_v2_controller_1.ApiV2Controller.handleApiV2);
exports.default = router;
