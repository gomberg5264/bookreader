const $ = require('../../../BookReader/jquery-1.10.1.js');
require('../../../BookReader/jquery-ui-1.12.0.min.js');
require('../../../BookReader/jquery.browser.min.js');
require('../../../BookReader/dragscrollable-br.js');
require('../../../BookReader/jquery.colorbox-min.js');
require('../../../BookReader/jquery.bt.min.js');

require('../../../BookReader/BookReader.js');
require('../../../src/js/plugins/menu_toggle/plugin.menu_toggle.js');


let br;
beforeAll(() => {
  $.fx.off = true;
  const OGSpeed = $.speed;
  $.speed = function(_speed, easing, callback) {
    console.log('speed');
    return OGSpeed(0, easing, callback);
  };
  document.body.innerHTML = '<div id="BookReader">';
  br = new BookReader();
  br.init();
});

afterEach(() => {
  $.fx.off = false;
  jest.clearAllMocks();
});

describe('Plugin: Menu Toggle', () => {
  test('has option flag', () => {
    expect(BookReader.defaultOptions.enableMenuToggle).toEqual(true);
  });

  test('when bookreader loads, the menu shows', () => {
    expect($('.BRfooter').hasClass('js-menu-hide')).toEqual(false);
    expect($('.BRtoolbar').hasClass('js-menu-hide')).toEqual(false);
  })

  test('clicking on background hides the menu', () => {
    expect($('.BRfooter').hasClass('js-menu-hide')).toEqual(false);
    expect($('.BRtoolbar').hasClass('js-menu-hide')).toEqual(false);
    $('.BRcontainer').click();
    expect($('.BRfooter').hasClass('js-menu-hide')).toEqual(true);
    expect($('.BRtoolbar').hasClass('js-menu-hide')).toEqual(true);
  });
});
