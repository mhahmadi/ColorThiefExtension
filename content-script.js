//debugger;

function colorThiefExtension($, colorThief, Handlebars) {
	var box = {};

	Handlebars.registerHelper("rgbToHex", function(rgb) {
		return '#' + $.map(rgb, function(number) {
			var hex = number.toString(16).toUpperCase();
			return hex.length === 1 ? '0'+hex : hex;
		}).join('');
	});

	var controlPanelTemplate;
	$.ajax({
		url: chrome.extension.getURL("control-panel.html"),
		cache: true,
		success: function (data) {
			controlPanelTemplate = Handlebars.compile(data);
		}
	});

	var paletteTemplate;
	$.ajax({
		url: chrome.extension.getURL("palette.html"),
		cache: true,
		success: function (data) {
			paletteTemplate = Handlebars.compile(data);
		}
	});

	var api = {
		active: false
	};

	api.start = function () {
		api.active = true;

		$('body').addClass('color-thief-enabled');

		$(controlPanelTemplate({})).appendTo('body');

		box.top = $('<div></div>').addClass('element-bounding-box').appendTo('body').hide();
		box.right = $('<div></div>').addClass('element-bounding-box').appendTo('body').hide();
		box.bottom = $('<div></div>').addClass('element-bounding-box').appendTo('body').hide();
		box.left = $('<div></div>').addClass('element-bounding-box').appendTo('body').hide();

		$('body').on('mousemove', function(e) {
			if ($(e.target).hasClass('element-bounding-box') || !$(e.target).is('img')) {
				$.each(box, function(key, value) {
					value.hide();
				});
				return;
			}

			var boundingBox = e.target.getBoundingClientRect();
			var scrollTop = $(window).scrollTop();
			var scrollLeft = $(window).scrollLeft();
			var top = boundingBox.top + scrollTop;
			var left = boundingBox.left + scrollLeft;
			var right = boundingBox.right + scrollLeft;
			var bottom = boundingBox.bottom + scrollTop;

			box.top.css({ top: top-2, left: left, width: boundingBox.width}).show();
			box.right.css({ top: top, left: right, height: boundingBox.height}).show();
			box.bottom.css({ top: bottom, left: left, width: boundingBox.width}).show();
			box.left.css({ top: top, left: left-2, height: boundingBox.height}).show();
		});

		$('body').on('keyup', function(e) {
			if (e.keyCode === 27) {
				api.stop();
			}
			return false;
		});

		$('body').on('click', '#color-thief-control-panel .close-button', function(e) {
			api.stop();
			return false;
		});

		$('body').on('click', function(e) {
			if ($(e.target).hasClass('element-bounding-box') || !$(e.target).is('img')) {
				return false;
			}
			var paletteSize = $('#color-thief-control-panel .num-colors-input').val();
			paletteSize = $.isNumeric(paletteSize) && paletteSize >= 2 && paletteSize <= 99 ? paletteSize : 10;
			$('#color-thief-control-panel .num-colors-input').val(paletteSize);
			var img = new Image();
			img.onload = function () {
			try {
				var palette = colorThief.getPalette(img, paletteSize, 7);
					$('#color-thief-control-panel .palette').html(paletteTemplate({palette: palette})).show();
				} catch (error) {
					$('#color-thief-control-panel .palette').html(paletteTemplate({error: "An error has occurred while analyzing the image"})).show();
				}
			};
			img.onerror = function(error) {
				$('#color-thief-control-panel .palette').html(
					paletteTemplate({error: "Image could not be loaded likely due to Cross-Origin Resource Sharing policy. Right-click on the image to open it in a new tab and try again."})).show();
			}
			img.crossOrigin = 'Anonymous';
			img.src = e.target.src;
			return false;                        
		});
	};

	api.stop = function () {
		api.active = false;

		$('#color-thief-control-panel').remove();

		$.each(box, function(key, value) {
			value.remove();
		});

		$('body').removeClass('color-thief-enabled')
			.off('mousemove')
			.off('keyup')
			.off('click');
	};

	return api;
}

var colorThiefExt = colorThiefExtension(jQuery, new ColorThief(), Handlebars);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action == "toggle") {
		if (colorThiefExt.active) {
			colorThiefExt.stop();
		} else {
			colorThiefExt.start();
		}
		sendResponse({});
	}
});