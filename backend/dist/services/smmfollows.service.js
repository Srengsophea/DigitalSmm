"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMMFollowsService = void 0;
const provider_service_1 = require("./provider.service");
class SMMFollowsService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SMMFollowsService.instance) {
            SMMFollowsService.instance = new SMMFollowsService();
        }
        return SMMFollowsService.instance;
    }
    async getBalance() {
        return provider_service_1.ProviderService.getInstance().getBalance('smmfollows');
    }
    async getServices() {
        return provider_service_1.ProviderService.getInstance().getServices('smmfollows');
    }
    async addOrder(params) {
        return provider_service_1.ProviderService.getInstance().addOrder('smmfollows', params);
    }
    async getOrderStatus(orderId) {
        return provider_service_1.ProviderService.getInstance().getOrderStatus('smmfollows', orderId);
    }
    async getMultipleOrdersStatus(orderIds) {
        return provider_service_1.ProviderService.getInstance().getMultipleOrdersStatus('smmfollows', orderIds);
    }
    async refillOrder(orderId) {
        return provider_service_1.ProviderService.getInstance().refillOrder('smmfollows', orderId);
    }
    async cancelOrders(orderIds) {
        return provider_service_1.ProviderService.getInstance().cancelOrders('smmfollows', orderIds);
    }
}
exports.SMMFollowsService = SMMFollowsService;
