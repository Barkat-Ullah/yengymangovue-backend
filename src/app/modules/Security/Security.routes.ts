import express from 'express';
import { PageContentController } from './Security.controller';

const router = express.Router();

// Create new page content
router.post('/', PageContentController.createPageContent);

// Get page content by type
router.get('/:type', PageContentController.getPageContent);

// Update page content by type
router.put('/:type', PageContentController.updatePageContent);

export default router;
