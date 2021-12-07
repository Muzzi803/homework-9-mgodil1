const app = require("./server");
const db = require("./server/data/db");

db.connect(); // no need to await for it due to Mongoose buffering!

const port = process.env.PORT || 6060;

app.listen(port, () => {
  console.log(`Express app listening at port: http://localhost:${port}/`);
});
