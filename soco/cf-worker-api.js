const fetchServerURL = async (roomNum) => {
    const response = await fetch(`https://json.vnres.co/room/${roomNum}/detail.json`);
    if (response.ok) {
      const text = await response.text();
      const match = text.match(/detail\((.*)\)/);
      if (match) {
        const jsonData = JSON.parse(match[1]);
        if (jsonData.code === 200) {
          const stream = jsonData.data.stream;
          return { m3u8: stream.m3u8, hdM3u8: stream.hdM3u8 };
        }
      }
    }
    return { m3u8: null, hdM3u8: null };
  };
  
  const fetchMatches = async (timeData, mainReferer, userAgent) => {
    console.log(`Getting matches for ${timeData}`);
    const response = await fetch(`https://json.vnres.co/match/matches_${timeData}.json`, {
      headers: {
        "referer": mainReferer || "https://json.vnres.co",
        "user-agent": userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "origin": "https://json.vnres.co",
      },
    });
    if (response.ok) {
      const text = await response.text();
      const match = text.match(/matches_\d+\((.*)\)/);
      if (match) {
        const jsonData = JSON.parse(match[1]);
        if (jsonData.code === 200) {
          const matches = jsonData.data;
          console.log(`Found ${matches.length} matches for ${timeData}`);
  
          const dailyMatches = [];
          const currentTimeSeconds = Math.floor(Date.now() / 1000);
          const tenMinutesLater = currentTimeSeconds + 600;
  
          for (const match of matches) {
            try {
              const leagueName = match.subCateName;
              const homeTeamName = match.hostName;
              const homeTeamLogo = match.hostIcon;
              const awayTeamName = match.guestName;
              const awayTeamLogo = match.guestIcon;
  
              const matchTime = Math.floor(match.matchTime / 1000);
              const matchStatus = (currentTimeSeconds >= matchTime || tenMinutesLater > matchTime)
                ? "live"
                : "vs";
  
              const serversList = [];
              if (matchStatus === "live") {
                for (const anchor of match.anchors) {
                  const serverRoom = anchor.anchor.roomNum;
                  const { m3u8, hdM3u8 } = await fetchServerURL(serverRoom);
  
                  if (m3u8) {
                    serversList.push({
                      name: "Soco SD",
                      stream_url: m3u8,
                      referer: mainReferer
                    });
                  }
                  if (hdM3u8) {
                    serversList.push({
                      name: "Soco HD",
                      stream_url: hdM3u8,
                      referer: mainReferer,
                    });
                  }
                }
              }
  
              dailyMatches.push({
                match_time: matchTime.toString(),
                match_status: matchStatus,
                home_team_name: homeTeamName,
                home_team_logo: homeTeamLogo,
                away_team_name: awayTeamName,
                away_team_logo: awayTeamLogo,
                league_name: leagueName,
                servers: serversList,
              });
            } catch (error) {
              console.error(error);
            }
          }
  
          return dailyMatches;
        }
      }
    }
    return [];
  };
  
  
  addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event.request));
  });
  
  
  async function handleRequest(request) {
  
    const url = new URL(request.url);
  
    if (url.pathname === "/matches") {
    const mainReferer =  "https://socolivev.co/";
    const userAgent = request.headers.get("user-agent") || "Default-User-Agent";
  
    const currentDate = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const nextDay = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0].replace(/-/g, "");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0].replace(/-/g, "");
  
    const matchTimes = [yesterday, currentDate, nextDay];
  
    const allMatches = [];
    for (const time of matchTimes) {
      const matches = await fetchMatches(time, mainReferer, userAgent);
      allMatches.push(...matches);
    }
  
    return new Response(JSON.stringify(allMatches, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
    }
    return new Response("Not Found", { status: 404 });
  }
  