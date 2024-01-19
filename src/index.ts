import * as dotenv from "dotenv";
import { initServer } from "./app";

dotenv.config();
console.log(process.env.AWS_S3_BUCKET);
async function init() {
  const app = await initServer();
  app.listen(8000, () => console.log(`Server Started at PORT:8000`));
}

init();
