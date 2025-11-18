import express from "express";
import { MetaController } from "./Meta.controller";

const router = express.Router();

router.get("/", MetaController.getAllMeta);
router.get("/:id", MetaController.getMetaById);

router.post(
  "/",
  MetaController.createIntoDb
);

router.patch(
  "/:id",
  MetaController.updateIntoDb
);

router.delete("/:id", MetaController.deleteIntoDb);

export const MetaRoutes = router;
