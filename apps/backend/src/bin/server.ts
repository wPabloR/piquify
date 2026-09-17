import "dotenv/config";
import app from "../infra/api/express/index.js";

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`Backend up and running on http://localhost:${port}`);
});
