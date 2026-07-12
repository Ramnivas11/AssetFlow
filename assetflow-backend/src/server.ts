import app from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

const PORT = env.PORT;

app.listen(PORT, () => {
    logger.info({ port: PORT }, "Server started");
});
