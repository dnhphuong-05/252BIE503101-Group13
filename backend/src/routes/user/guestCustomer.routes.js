import express from "express";
import { validate } from "../../middlewares/validate.js";
import * as validator from "../../validators/user/guestCustomer.validator.js";
import * as controller from "../../controllers/user/guestCustomer.controller.js";

const router = express.Router();

/**
 * @route   POST /api/guest-customers
 * @desc    Create or update guest customer
 * @access  Public
 */
router.post("/", validate(validator.createGuestCustomer), controller.createGuestCustomer);

export default router;
