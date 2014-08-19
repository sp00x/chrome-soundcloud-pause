console.log("start.")

var ports = {};
var portsCount = 0;

var manifest = chrome.runtime.getManifest();

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//// installation/update /////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function onInstalled(details)
{
	switch (details.reason)
	{
		case "update":
			if (details.previousVersion != manifest.version)
			{
				// details.previousVersion
			}
			break;
	}

	console.log("onInstalled: %o", details);
}

chrome.runtime.onInstalled.addListener(onInstalled);

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//// badge click event ///////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

var pausedPort = null;

var requestId = null;
var responseCount = 0;
var responseCallback = null;

function togglePlayer()
{
	findActivePlayer(function(port, index)
	{
		if (port)
		{
			console.log("Found the playing port! ", port, index)
			pausedPort = { port: port, index: index };
			pausedPort.port.postMessage({ type: 'pause', index: pausedPort.index });
		}
		else
		{
			console.log("No playing port found.");
			if (pausedPort != null)
			{
				// try to resume the paused tab
				pausedPort.port.postMessage({ type: 'resume', index: pausedPort.index });
				pausedPort = null;
			}
		}
	})
}

function findActivePlayer(callback)
{
	// try to find any playing tabs
	responseCallback = callback;
	console.log("broadcasting to ports..")
	requestId = Date.now();
	responseCount = 0;
	for (var i in ports)
	{
		console.log(" -> " + i);
		ports[i].buttons = null;
		ports[i].port.postMessage({ type: 'find', requestId: requestId })
	}
	console.log("broadcasted to all ports")
}

function onClickAction(tab)
{
	togglePlayer();
};

chrome.browserAction.setPopup({ popup: "" })
//chrome.browserAction.setBadgeText({ text: "?" });
chrome.browserAction.onClicked.addListener(onClickAction);

function updateBadge(state)
{
	switch (state)
	{
		case 'unknown':
			break;

		case 'playing':
			break;

		case 'paused':
			break;
	}
}

updateBadge('unknown');

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//// port ////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

chrome.runtime.onConnect.addListener(
	function portConnected(port)
	{
		portsCount++;
		console.log("connection count =", portsCount)

		console.log("port %s connected: %o", port.name, port)

		var p = ports[port.name] = { buttons: null, port: port };

		port.onMessage.addListener(function(msg)
		{
			console.log("port %s said: %o", port.name, msg);

			if (msg.requestId == null)
			{
				if (msg.type == 'paused')
				{
					updateBadge('paused');
				}
				else if (msg.type == 'resumed')
				{
					updateBadge('playing')
				}
			}
			else if (msg.requestId == requestId)
			{
				if (msg.type == "status")
				{
					responseCount++;
					p.buttons = msg.buttons;

					for (var i=0; msg.buttons.length>i; i++)
					{
						if (msg.buttons[i] === true)
						{
							if (responseCallback)
							{
								responseCallback(port, i);
								responseCallback = null;
							}
							else
							{
								console.error("MORE THAN ONE PLAYING PORT??", port, i);
							}
						}
					}

					if (responseCount == portsCount)
					{
						console.log("all ports responded");
						if (responseCallback)
						{
							responseCallback(null, null);
							responseCallback = null;
						}
					}
				}				
			}
			else
			{
				console.log("ignored - port %s responded to old request id: %o", port.name, msg);
			}
		})

		port.onDisconnect.addListener(function()
		{
			console.log("port %s disconnected: %o", port.name, port)
			delete ports[port.name];

			portsCount--;
			console.log("connection count =", portsCount)

			if (pausedPort != null && pausedPort.port == port)
			{
				console.log("closed port was the paused one - removing flag")
				pausedPort = null;
			}
		})
	}
)

console.log("end.")