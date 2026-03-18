import express from "express";
import "dotenv/config";
const app = express();
const port = process.env.PORT;
app.get("/server/health", function (req, res) {
    res.status(200).json({ message: "Server is up and running" });
});
app.listen(port, function () {
    console.log(`Server is spinning at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map