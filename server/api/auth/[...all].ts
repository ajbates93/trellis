import { auth } from "../../utils/auth";

export default defineEventHandler((event) => {
  console.log("making it here");
  return auth.handler(toWebRequest(event));
});
