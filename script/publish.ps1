set-location ..
& tsc
& robocopy ./ "\\192.168.3.173\Node Server\server" *.js *.json /e /xd .* node_modules data /xo /xf tsconfig.json tslint.json