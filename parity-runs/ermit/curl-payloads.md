## default settings
```
curl 'http://localhost:8080/cgi-bin/fswepp/ermit/erm.pl' \
-X 'POST' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Pragma: no-cache' \
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
-H 'Sec-Fetch-Site: same-origin' \
-H 'Accept-Language: en-US,en;q=0.9' \
-H 'Cache-Control: no-cache' \
-H 'Sec-Fetch-Mode: navigate' \
-H 'Accept-Encoding: gzip, deflate' \
-H 'Origin: http://localhost:8081' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15' \
-H 'Referer: http://localhost:8081/cgi-bin/fswepp/ermit/ermit.pl' \
-H 'Upgrade-Insecure-Requests: 1' \
-H 'Content-Length: 248' \
-H 'Connection: keep-alive' \
-H 'Sec-Fetch-Dest: document' \
-H 'Cookie: FSWEPPuser=1edb' \
-H 'Priority: u=0, i' \
--data 'me=&units=ft&debug=0&Climate=..%2Fclimates%2Fal010831&SoilType=clay&rfg=20&achtung=Run+WEPP&vegetation=forest&top_slope=0&avg_slope=50&toe_slope=30&length=300&severity=l&pct_shrub=&pct_grass=&pct_bare=&climate_name=&Units=m&actionw=Running+ERMiT...'
```

## mount shasta, silt loam, high sev
```
curl 'http://localhost:8081/cgi-bin/fswepp/ermit/erm.pl' \
-X 'POST' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Pragma: no-cache' \
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
-H 'Sec-Fetch-Site: same-origin' \
-H 'Accept-Language: en-US,en;q=0.9' \
-H 'Cache-Control: no-cache' \
-H 'Sec-Fetch-Mode: navigate' \
-H 'Accept-Encoding: gzip, deflate' \
-H 'Origin: http://localhost:8081' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15' \
-H 'Referer: http://localhost:8081/cgi-bin/fswepp/ermit/ermit.pl' \
-H 'Upgrade-Insecure-Requests: 1' \
-H 'Content-Length: 253' \
-H 'Connection: keep-alive' \
-H 'Sec-Fetch-Dest: document' \
-H 'Cookie: FSWEPPuser=1edb' \
-H 'Priority: u=0, i' \
--data 'me=&units=ft&debug=0&Climate=..%2Fclimates%2Fca045983&SoilType=silt&rfg=20&achtung=Run+WEPP&vegetation=range&top_slope=0&avg_slope=50&toe_slope=30&length=300&severity=h&pct_shrub=15&pct_grass=75&pct_bare=10&climate_name=&Units=m&actionw=Running+ERMiT...'
```

## flagstaff, loam, chapparal, unburned
```
curl 'http://localhost:8081/cgi-bin/fswepp/ermit/erm.pl' \
-X 'POST' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Pragma: no-cache' \
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
-H 'Sec-Fetch-Site: same-origin' \
-H 'Accept-Language: en-US,en;q=0.9' \
-H 'Cache-Control: no-cache' \
-H 'Sec-Fetch-Mode: navigate' \
-H 'Accept-Encoding: gzip, deflate' \
-H 'Origin: http://localhost:8081' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15' \
-H 'Referer: http://localhost:8081/cgi-bin/fswepp/ermit/ermit.pl' \
-H 'Upgrade-Insecure-Requests: 1' \
-H 'Content-Length: 251' \
-H 'Connection: keep-alive' \
-H 'Sec-Fetch-Dest: document' \
-H 'Cookie: FSWEPPuser=1edb' \
-H 'Priority: u=0, i' \
--data 'me=&units=ft&debug=0&Climate=..%2Fclimates%2Faz023010&SoilType=loam&rfg=20&achtung=Run+WEPP&vegetation=chap&top_slope=0&avg_slope=50&toe_slope=30&length=300&severity=u&pct_shrub=80&pct_grass=0&pct_bare=20&climate_name=&Units=m&actionw=Running+ERMiT...'
```

## denver, silt loam, 50-50-50, high sev forest
```
curl 'http://localhost:8081/cgi-bin/fswepp/ermit/erm.pl' \
-X 'POST' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Pragma: no-cache' \
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
-H 'Sec-Fetch-Site: same-origin' \
-H 'Accept-Language: en-US,en;q=0.9' \
-H 'Cache-Control: no-cache' \
-H 'Sec-Fetch-Mode: navigate' \
-H 'Accept-Encoding: gzip, deflate' \
-H 'Origin: http://localhost:8081' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15' \
-H 'Referer: http://localhost:8081/cgi-bin/fswepp/ermit/ermit.pl' \
-H 'Upgrade-Insecure-Requests: 1' \
-H 'Content-Length: 249' \
-H 'Connection: keep-alive' \
-H 'Sec-Fetch-Dest: document' \
-H 'Cookie: FSWEPPuser=1edb' \
-H 'Priority: u=0, i' \
--data 'me=&units=ft&debug=0&Climate=..%2Fclimates%2Fco052220&SoilType=silt&rfg=20&achtung=Run+WEPP&vegetation=forest&top_slope=50&avg_slope=50&toe_slope=50&length=300&severity=h&pct_shrub=&pct_grass=&pct_bare=&climate_name=&Units=m&actionw=Running+ERMiT...'
```

## moscow, clay loam, 20-30-20, low sev forest
```
curl 'http://localhost:8081/cgi-bin/fswepp/ermit/erm.pl' \
-X 'POST' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-H 'Pragma: no-cache' \
-H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
-H 'Sec-Fetch-Site: same-origin' \
-H 'Accept-Language: en-US,en;q=0.9' \
-H 'Cache-Control: no-cache' \
-H 'Sec-Fetch-Mode: navigate' \
-H 'Accept-Encoding: gzip, deflate' \
-H 'Origin: http://localhost:8081' \
-H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Safari/605.1.15' \
-H 'Referer: http://localhost:8081/cgi-bin/fswepp/ermit/ermit.pl' \
-H 'Upgrade-Insecure-Requests: 1' \
-H 'Content-Length: 249' \
-H 'Connection: keep-alive' \
-H 'Sec-Fetch-Dest: document' \
-H 'Cookie: FSWEPPuser=1edb' \
-H 'Priority: u=0, i' \
--data 'me=&units=ft&debug=0&Climate=..%2Fclimates%2Fid106152&SoilType=clay&rfg=20&achtung=Run+WEPP&vegetation=forest&top_slope=20&avg_slope=30&toe_slope=20&length=300&severity=l&pct_shrub=&pct_grass=&pct_bare=&climate_name=&Units=m&actionw=Running+ERMiT...'
```