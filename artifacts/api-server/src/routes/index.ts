import { Router, type IRouter } from "express";
import healthRouter from "./health";
import customersRouter from "./customers";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(customersRouter);
router.use(ordersRouter);

export default router;
