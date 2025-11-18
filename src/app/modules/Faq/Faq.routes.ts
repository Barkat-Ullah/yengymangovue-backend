import express from "express";
import { FaqController } from "./Faq.controller";
import validateRequest from "../../middlewares/validateRequest";
import { FaqValidation } from "./Faq.validation";

const router = express.Router();

router.get("/", FaqController.getAllFaq);
router.get("/my", FaqController.getMyFaq);  
router.get("/:id", FaqController.getFaqById);

router.post(
  "/",
  validateRequest.body(FaqValidation.createFaqZodSchema),
  FaqController.createIntoDb
);

router.patch(
  "/:id",
  validateRequest.body(FaqValidation.updateFaqZodSchema),
  FaqController.updateIntoDb
);

router.delete("/:id", FaqController.deleteIntoDb);
router.delete("/soft/:id", FaqController.softDeleteIntoDb);

export const FaqRoutes = router;
