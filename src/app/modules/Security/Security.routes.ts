import express from 'express';
import { PageContentController } from './Security.controller';

const router = express.Router();

// Create new page content

// Get page content by type

router.get('/', PageContentController.getAllPages);
router.get('/:type', PageContentController.getPageContent);
router.post('/', PageContentController.createPageContent);

// Update page content by type
router.put('/:type', PageContentController.updatePageContent);

export const SecurityRouter = router;
