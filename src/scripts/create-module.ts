import fs from 'fs';
import path from 'path';

// Function to create a module with dynamic files
const createModule = (moduleName: string): void => {
  const baseDir = path.join(__dirname, '../', 'app', 'modules', moduleName);

  const files = [
    `${moduleName}.routes.ts`,
    `${moduleName}.controller.ts`,
    `${moduleName}.service.ts`,
    `${moduleName}.validation.ts`,
  ];

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`Directory created: ${baseDir}`);
  }

  files.forEach(file => {
    const filePath = path.join(baseDir, file);
    if (!fs.existsSync(filePath)) {
      let content = '';

      if (file.endsWith('.routes.ts')) {
        content = `import express from "express";
import { ${capitalize(
          moduleName,
        )}Controller } from "./${moduleName}.controller";
import validateRequest from "../../middlewares/validateRequest";
import { ${capitalize(
          moduleName,
        )}Validation } from "./${moduleName}.validation";

const router = express.Router();

router.get("/", ${capitalize(moduleName)}Controller.getAll${capitalize(
          moduleName,
        )});
router.get("/my", ${capitalize(moduleName)}Controller.getMy${capitalize(
          moduleName,
        )});  
router.get("/:id", ${capitalize(moduleName)}Controller.get${capitalize(
          moduleName,
        )}ById);

router.post(
  "/",
  validateRequest.body(${capitalize(moduleName)}Validation.create${capitalize(
    moduleName,
  )}ZodSchema),
  ${capitalize(moduleName)}Controller.createIntoDb
);

router.patch(
  "/:id",
  validateRequest.body(${capitalize(moduleName)}Validation.update${capitalize(
    moduleName,
  )}ZodSchema),
  ${capitalize(moduleName)}Controller.updateIntoDb
);

router.delete("/:id", ${capitalize(moduleName)}Controller.deleteIntoDb);
router.delete("/soft/:id", ${capitalize(
          moduleName,
        )}Controller.softDeleteIntoDb);

export const ${capitalize(moduleName)}Routes = router;
`;
      } else if (file.endsWith('.controller.ts')) {
        content = `import catchAsync from "../../utils/catchAsync";
import httpStatus from "http-status";
import sendResponse from "../../utils/sendResponse";
import { Request, Response } from "express";
import { ${capitalize(moduleName)}Services } from "./${moduleName}.service";

const createIntoDb = catchAsync(async (req: Request, res: Response) => {
  const result = await ${capitalize(moduleName)}Services.createIntoDb(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Successfully created ${moduleName}",
    data: result,
  });
});

const getAll${capitalize(
          moduleName,
        )} = catchAsync(async (req: Request, res: Response) => {
  const result = await ${capitalize(moduleName)}Services.getAll${capitalize(
    moduleName,
  )}(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved all ${moduleName}",
    data: result,
  });
});

const getMy${capitalize(
          moduleName,
        )} = catchAsync(async (req: Request, res: Response) => {  
  const result = await ${capitalize(moduleName)}Services.getMy${capitalize(
    moduleName,
  )}(req.user.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved my ${moduleName}",
    data: result,
  });
});

const get${capitalize(
          moduleName,
        )}ById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ${capitalize(moduleName)}Services.get${capitalize(
    moduleName,
  )}ByIdFromDB(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved ${moduleName} by id",
    data: result,
  });
});

const updateIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ${capitalize(
    moduleName,
  )}Services.updateIntoDb(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully updated ${moduleName}",
    data: result,
  });
});

const deleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ${capitalize(moduleName)}Services.deleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully deleted ${moduleName}",
    data: result,
  });
});

const softDeleteIntoDb = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ${capitalize(moduleName)}Services.softDeleteIntoDb(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully soft deleted ${moduleName}",
    data: result,
  });
});

export const ${capitalize(moduleName)}Controller = {
  createIntoDb,
  getAll${capitalize(moduleName)},
  getMy${capitalize(moduleName)}, 
  get${capitalize(moduleName)}ById,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
`;
      } else if (file.endsWith('.service.ts')) {
        content = `
import { Request } from "express";

const createIntoDb = async (req:Request) => {

  return null;
};

const getAll${capitalize(moduleName)} = async (query: Record<string, any>) => {
  console.log(query);
  return [];
};

const getMy${capitalize(moduleName)} = async (userId: string) => {  
 
  console.log('Fetching my ${moduleName} for user:', userId);
  return []; 
};

const get${capitalize(moduleName)}ByIdFromDB = async (id: string) => {
  console.log(id);
  return null;
};

const updateIntoDb = async (id: string, data: Partial<any>) => {
  console.dir({ id, data });
  return null;
};

const deleteIntoDb = async (id: string) => {
  console.log(id);
  return null;
};

const softDeleteIntoDb = async (id: string) => {
  console.log(id);
  return null;
};

export const ${capitalize(moduleName)}Services = {
  createIntoDb,
  getAll${capitalize(moduleName)},
  getMy${capitalize(moduleName)}, 
  get${capitalize(moduleName)}ByIdFromDB,
  updateIntoDb,
  deleteIntoDb,
  softDeleteIntoDb,
};
`;
      } else if (file.endsWith('.validation.ts')) {
        content = `import { z } from "zod";

const create${capitalize(moduleName)}ZodSchema = z.object({
  body: z.object({
  
    name: z.string({ required_error: "Name is required" }),
  }),
});

const update${capitalize(moduleName)}ZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const ${capitalize(moduleName)}Validation = {
  create${capitalize(moduleName)}ZodSchema,
  update${capitalize(moduleName)}ZodSchema,
};
`;
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`File created: ${filePath}`);
    }
  });

  console.log(`\n✅ Module '${moduleName}' has been created successfully!\n`);
};

const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

const moduleName = process.argv[2];
if (!moduleName) {
  console.error('❌ Please provide a module name.');
  process.exit(1);
}

createModule(moduleName);
