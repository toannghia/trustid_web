const axios = require("axios");

async function check() {
  try {
    const resItems = await axios.get("http://localhost:3000/api/v1/codes/items?limit=100&search=0092");
    console.log("CodeItems from API:", JSON.stringify(resItems.data.data, null, 2));

    // Also try to scan it
    if (resItems.data.data.length > 0) {
      const codeString = resItems.data.data[0].codeString;
      const resScan = await axios.get(`http://localhost:3000/api/v1/scan/check?code=${codeString}`);
      console.log("ScanCheck from API:", JSON.stringify(resScan.data, null, 2));
    }
  } catch (e) {
    if (e.response) {
      console.error(e.response.data);
    } else {
      console.error(e.message);
    }
  }
}
check();
