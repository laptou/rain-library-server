& tsc
& robocopy ./ "\\192.168.2.202\ibiyemi.intulon.com\server" *.js *.json /e /xd .* node_modules data /xo /xf tsconfig.json tslint.json