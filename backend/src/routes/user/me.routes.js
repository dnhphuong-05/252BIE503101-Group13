import express from "express";
import { uploadAvatar } from "../../config/index.js";
import { validate } from "../../middlewares/validate.js";
import { protect } from "../../middlewares/auth.middleware.js";
import * as controller from "../../controllers/user/me.controller.js";
import * as validator from "../../validators/user/me.validator.js";

const router = express.Router();

// All /me endpoints require authentication
router.use(protect);

router.get("/summary", controller.getSummary);
router.get("/loyalty-vouchers", controller.getLoyaltyVouchers);
router.get(
  "/loyalty-transactions",
  validate(validator.getLoyaltyTransactions, "query"),
  controller.getLoyaltyTransactions,
);

router.get("/profile", controller.getProfile);
router.put("/profile", validate(validator.updateProfile), controller.updateProfile);
router.put("/profile/password", validate(validator.changePassword), controller.changePassword);
router.post("/profile/avatar", uploadAvatar.single("avatar"), controller.uploadAvatar);

router.get("/addresses", controller.getAddresses);
router.post("/addresses", validate(validator.addAddress), controller.addAddress);
router.put("/addresses/:addressId", validate(validator.updateAddress), controller.updateAddress);
router.delete("/addresses/:addressId", validate(validator.deleteAddress), controller.deleteAddress);
router.put(
  "/addresses/:addressId/default",
  validate(validator.setDefaultAddress),
  controller.setDefaultAddress,
);

router.get("/measurements", controller.getMeasurements);
router.put("/measurements", validate(validator.updateMeasurements), controller.updateMeasurements);

export default router;
