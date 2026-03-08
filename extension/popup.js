document.getElementById('scrape').addEventListener('click', () => {

  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    const tab = tabs[0];

    browser.tabs.sendMessage(tab.id, { action: "scrape" }).then(result => {

      if (!result || !result.name) {
        document.getElementById('result').textContent = "Erreur scraping";
        return;
      }

      fetch("http://localhost:3210/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: tab.url,
          ...result
        })
      })
      .then(res => res.json())
      .then(data => {
        document.getElementById('result').textContent =
          JSON.stringify(data, null, 2);
      })
      .catch(err => {
        document.getElementById('result').textContent = err;
      });

    });
  });

});