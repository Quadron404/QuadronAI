2026-03-18T13:57:55.123273Z	Cloning repository...
2026-03-18T13:57:55.723152Z	From https://github.com/Quadron404/QuadronAI
2026-03-18T13:57:55.7236Z	 * branch            f40e753726910c7924bd2a25a28e57aa868db2ba -> FETCH_HEAD
2026-03-18T13:57:55.723713Z	
2026-03-18T13:57:55.749098Z	HEAD is now at f40e753 Update chat.js
2026-03-18T13:57:55.749489Z	
2026-03-18T13:57:55.798815Z	
2026-03-18T13:57:55.799301Z	Using v2 root directory strategy
2026-03-18T13:57:55.813002Z	Success: Finished cloning repository files
2026-03-18T13:57:58.314121Z	Checking for configuration in a Wrangler configuration file (BETA)
2026-03-18T13:57:58.314688Z	
2026-03-18T13:57:59.422831Z	No Wrangler configuration file found. Continuing.
2026-03-18T13:57:59.423215Z	No build command specified. Skipping build step.
2026-03-18T13:57:59.423793Z	Found Functions directory at /functions. Uploading.
2026-03-18T13:57:59.431514Z	 ⛅️ wrangler 3.101.0
2026-03-18T13:57:59.431667Z	-------------------
2026-03-18T13:58:00.352281Z	✘ [ERROR] The JSX syntax extension is not currently enabled
2026-03-18T13:58:00.35276Z	
2026-03-18T13:58:00.352814Z	    ../../../buildhome/repo/functions/api/chat.js:1:0:
2026-03-18T13:58:00.352865Z	      1 │ <!DOCTYPE html>
2026-03-18T13:58:00.352904Z	        ╵ ^
2026-03-18T13:58:00.352939Z	
2026-03-18T13:58:00.352975Z	  The esbuild loader for this file is currently set to "js" but it must be set to "jsx" to be able to parse JSX syntax. You can use "loader: { '.js': 'jsx' }" to do that.
2026-03-18T13:58:00.353015Z	
2026-03-18T13:58:00.353065Z	✘ [ERROR] Expected identifier but found "!"
2026-03-18T13:58:00.353118Z	
2026-03-18T13:58:00.353173Z	    ../../../buildhome/repo/functions/api/chat.js:1:1:
2026-03-18T13:58:00.353353Z	      1 │ <!DOCTYPE html>
2026-03-18T13:58:00.353408Z	        ╵  ^
2026-03-18T13:58:00.353445Z	
2026-03-18T13:58:00.359221Z	
2026-03-18T13:58:00.418725Z	[31m✘ [41;31m[[41;97mERROR[41;31m][0m [1mBuild failed with 2 errors:[0m
2026-03-18T13:58:00.419087Z	
2026-03-18T13:58:00.419225Z	  ../../../buildhome/repo/functions/api/chat.js:1:0: ERROR: The JSX syntax extension is not currently enabled
2026-03-18T13:58:00.419316Z	  ../../../buildhome/repo/functions/api/chat.js:1:1: ERROR: Expected identifier but found "!"
2026-03-18T13:58:00.419561Z	
2026-03-18T13:58:00.419675Z	
2026-03-18T13:58:00.433036Z	🪵  Logs were written to "/root/.config/.wrangler/logs/wrangler-2026-03-18_13-58-00_023.log"
2026-03-18T13:58:00.510773Z	Failed building Pages Functions.
2026-03-18T13:58:02.003981Z	Failed: generating Pages Functions failed. Check the logs above for more information. If this continues for an unknown reason, contact support: https://cfl.re/3WgEyrH
