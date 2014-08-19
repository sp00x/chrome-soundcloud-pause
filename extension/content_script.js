var myName = "_sc_tab_" + Math.floor(Math.random() * 0xFFFFFFFF) + '_' + Date.now();

//console.log("creating port", myName)

var buttons = [];

var port = chrome.runtime.connect({ name: myName });

port.onMessage.addListener(function(msg)
{
	console.log("got message:", msg)

	if (msg.type == "find")
	{		
		buttons = getPlayControls();
		console.log("found buttons:", buttons);
		port.postMessage({ type: 'status', requestId: msg.requestId, buttons: buttons.map(function(x) { return x.isPlaying }) })
		console.log("done")
	}
	else if (msg.type == "pause" || msg.type == "resume")
	{
		try
		{
			console.log("clicking the button.. [" + msg.type + "]")
			var b = buttons[msg.index].node;
			b.click();
			port.postMessage({ type: msg.type + 'd' });
		}
		catch (e)
		{
			console.error("Error while clicking SC button:", e)
		}	
	}
	else
		console.log("ignored message:", msg)
})

function getPlayControls()
{
	var buttons = [];
	var nodes = document.getElementsByClassName("playControl sc-ir");
	for (var i=0; nodes.length>i; i++)
	{
		if (nodes[i].nodeName == "BUTTON")
		{
			buttons.push({ node: nodes[i], isPlaying: nodes[i].className.match(/\bplaying\b/i) != null });
		}
	}
	return buttons;
}
