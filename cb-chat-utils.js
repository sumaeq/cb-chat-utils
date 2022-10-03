// ==UserScript==
// @name         CBUtils
// @version      0.4.2
// @description  CB chat utils. Allows filtering and graying out non-user messages.
// @author       Suma
// @match        https://chaturbate.com/*
// @icon         https://www.google.com/s2/favicons?domain=chaturbate.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/arrive/2.4.1/arrive.min.js
// @updateURL    https://raw.githubusercontent.com/sumaeq/cb-chat-utils/main/cb-chat-utils.js
// @downloadURL  https://raw.githubusercontent.com/sumaeq/cb-chat-utils/main/cb-chat-utils.js
// @grant        GM.setValue
// @grant        GM.getValue
// ==/UserScript==

/*
 CHANGELOG

  v0.4.2
    - Added whisper & mod chat exceptions

  v0.4.1:
    - Added second autotipper confirmation for bigger tips

  v0.4.0:
    - Added video filters
*/

(()=>{

    const icon = `url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2`
                + `000/svg' width='32' height='32' viewBox='0 0 24 24' fill='no`
                + `ne' stroke='%23634c00' stroke-width='1.5' stroke-linecap='ro`
                + `und' stroke-linejoin='round' class='feather feather-message-`
                + `circle'%3E%3Cpath d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5`
                + ` 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38`
                + ` 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.`
                + `5a8.48 8.48 0 0 1 8 8v.5z'%3E%3C/path%3E%3C/svg%3E")`;

    let isDragging = false;
    let wasDragged = false;
    let lastDragged = 0;

    let isChatPoppedOut = false;
    let chatWindow = null;

    const settingsBase = [
        { type: 'checkbox', id: 'enableFade', label: 'Gray out non-user messages', default: true },
        { type: 'checkbox', id: 'enableFiltering', label: 'Enable chat filtering', default: false },
        { type: 'checkbox', id: 'enableTime', label: 'Enable timestamps', default: false },
        { type: 'checkbox', id: 'enableScrollFix', label: 'Enable scroll fix', default: false }
    ];

    const settings = {};
    for (const b of settingsBase) settings[b.id] = b.default ?? null;

    const $toolIcon = $('<div data-cbutils-tool="true"/>')
        .css({
            'position': 'fixed',
            'display': 'inline-block',
            'z-index': '10000',
            'top': '15px',
            'left': '15px',
            'width': '30px',
            'height': '30px',
            'background-image': `${icon}, linear-gradient(347deg, rgba(255,206,206,0.8) 0%, rgba(255,236,158,0.8) 50%, rgba(218,255,211,0.8) 100%)`,
            'background-repeat': 'no-repeat',
            'background-position': 'center',
            'background-size': '60%, cover',
            'border-radius': '50%',
            'box-shadow': '2px 2px 15px rgba(0, 0, 0, 0.5)',
            'backdrop-filter': 'blur(5px)',
            'cursor': 'pointer'
        })
        .click(e => {
            if (Date.now() - lastDragged <= 100) return;
            $settings.show();
        })

    const $settings = $('<div data-cbutils-settings="true"/>')
        .css({
            'z-index': '9999',
            'position': 'fixed',
            'display': 'block',
            'font-size': '8pt !important',
            'width': '180px',
            'top': '15px',
            'left': '15px',
            'padding': '1em',
            'background': 'rgba(255, 255, 255, 0.8)',
            'box-shadow': '2px 2px 15px rgba(0, 0, 0, 0.8)',
            'backdrop-filter': 'blur(5px)',
            'border-radius': '5px',
        })
        .append(
            ...settingsBase.map(sett => {
                switch (sett.type) {
                    case 'checkbox': {
                        return $('<div/>').append(
                            $('<label/>').append(
                                $('<input type="checkbox"/>')
                                    .attr('name', sett.id)
                                    .attr('data-cbutils-setting', sett.id)
                                    .change(e => {
                                        const $this = $(e.currentTarget);
                                        const settingId = $this.attr('name');
                                        console.log(settingId + ' -> ' + $this.is(':checked'))
                                        settingChanged(settingId, $this.is(':checked'));
                                    }),
                                sett.label ?? '?'
                            )
                        )
                        break;
                    }
                }
            }),
            $('<button/>')
                .text('Launch autotipper')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(106,29,191,1) 0%, rgba(197,116,252,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {
                    e.preventDefault();
                    $autotipper.show();
                }),
            $('<button/>')
                .text('Video filters')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(19,134,130,1) 0%, rgba(116,223,224,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {
                    e.preventDefault();
                    $videoFilters.show();
                }),
            /*$('<button/>')
                .text('Pop out chat')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(138,98,98,1) 0%, rgba(255,202,202,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {
                    e.preventDefault();
                    popOutChat();
                }),*/
            $('<button/>')
                .text('Hide options')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(38,191,29,1) 0%, rgba(173,252,116,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {
                    e.preventDefault();
                    $settings.fadeOut(50);
                })
        )
        .hide();

    const $autotipper = $('<div data-cbutils-autotipper="true"/>')
        .css({
            'z-index': '9999',
            'position': 'fixed',
            'display': 'block',
            'font-size': '8pt !important',
            'width': '180px',
            'top': '15px',
            'left': '15px',
            'padding': '1em',
            'background': 'rgba(255, 255, 255, 0.8)',
            'box-shadow': '2px 2px 15px rgba(0, 0, 0, 0.8)',
            'backdrop-filter': 'blur(5px)',
            'border-radius': '5px',
        })
        .append(
            $('<p style="margin-top: 0;"/>').append(
                'To user<br>',
                $('<input type="text" data-autotip-field="tipUser"/>').val(`${window.location.href.split('/').filter(p => p.trim() != '').slice(-1)[0]}`)
            ),
            $('<p/>').append(
                'With message<br>',
                $('<input type="text" data-autotip-field="tipMessage" value="Hello world!"/>')
            ),
            $('<p/>').append(
                'Tokens per tip<br>',
                $('<input type="number" min="1" max="1000" data-autotip-field="tipTokens" value="1"/>')
            ),
            $('<p/>').append(
                'How many times?<br>',
                $('<input type="number" min="1" max="1000" data-autotip-field="tipTimes" value="5"/>')
            ),
            $('<p/>').append(
                'Timer interval (millis)<br>',
                $('<input type="number" min="1" max="10000" data-autotip-field="tipInterval" value="500"/>')
            ),
            $('<button/>')
                .text('Ok (asks first)')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(38,191,29,1) 0%, rgba(173,252,116,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {

                    e.preventDefault();

                    const opts = Object.fromEntries([...document.querySelectorAll('[data-autotip-field]')].map(el => [el.getAttribute('data-autotip-field'), el.matches('[type="number"]') ? parseInt(el.value) : el.value]));
                    const {
                        tipMessage,
                        tipUser,
                        tipTokens,
                        tipTimes,
                        tipInterval
                    } = opts;

                    if (!confirm(`ARE YOU SURE?\n\nThis will tip ${tipTimes}x${tipTokens}=${tipTimes*tipTokens} tokens to "${tipUser}", with interval of ${tipInterval}ms and the following message:\n\n"${tipMessage}"`)) return;

                    if (tipTokens >= 5 || tipTimes > 15) {
                        if (!confirm([
                            `–––––––– ––––––––`,
                            `⚠️⚠️⚠️ ARE YOU ABSOLUTELY SURE??? ⚠️⚠️⚠️`,
                            `–––––––– ––––––––`,
                            `Your tip tokens (${tipTokens}) or tip times (${tipTimes}) seem a bit high, are you sure? (This autotip process will consume ${tipTimes*tipTokens} tokens in total.)`
                        ].join('\n'))) return;
                    }

                    for (let i = 0; i < tipTimes; i++) {
                        setTimeout(() => {
                            $.post(`https://chaturbate.com/tipping/send_tip/${tipUser}/`, {
                                csrfmiddlewaretoken: $.cookie('csrftoken'),
                                tip_amount: tipTokens,
                                message: tipMessage,
                                source: 'theater',
                                tip_type: 'public',
                                video_mode: 'split'
                            })
                        }, i*tipInterval);
                    }

                }),
            $('<button/>')
                .text('Cancel')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(98,98,98,1) 0%, rgba(199,199,199,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {
                    e.preventDefault();
                    $autotipper.hide();
                })
        )
        .hide();

    const $getVideo = () => document.querySelector('video[src^="blob"]');

    function updateVideoFilters() {
        const values = Object.fromEntries([...document.querySelectorAll('[data-videofilter-field]')].map(el => {
            if (el.matches('input[type="checkbox"]')) return [el.getAttribute('data-videofilter-field'), el.checked];
            return [el.getAttribute('data-videofilter-field'), el.value];
        }));
        if (!$getVideo()) return;
        $getVideo().style.filter = `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%) hue-rotate(${values.hue}deg)`;
        $getVideo().style.transform = `scaleX(${values.flipX ? -1 : 1}) scaleY(${values.flipY ? -1 : 1})`;
    }

    const $videoFilters = $('<div data-cbutils-videofilters="true"/>')
        .css({
            'z-index': '9999',
            'position': 'fixed',
            'display': 'block',
            'font-size': '8pt !important',
            'width': '180px',
            'top': '15px',
            'left': '15px',
            'padding': '1em',
            'background': 'rgba(255, 255, 255, 0.8)',
            'box-shadow': '2px 2px 15px rgba(0, 0, 0, 0.8)',
            'backdrop-filter': 'blur(5px)',
            'border-radius': '5px',
        })
        .append(
            $('<p/>').append(
                'Brightness<br>',
                $('<input type="range" data-videofilter-field="brightness" value="100" min="0" max="200" data-default="100" style="width: 100%;"/>')
                    .bind('input change', e => updateVideoFilters())
            ),
            $('<p/>').append(
                'Contrast<br>',
                $('<input type="range" data-videofilter-field="contrast" value="100" min="0" max="200" data-default="100" style="width: 100%;"/>')
                    .bind('input change', e => updateVideoFilters())
            ),
            $('<p/>').append(
                'Saturation<br>',
                $('<input type="range" data-videofilter-field="saturation" value="100" min="0" max="200" data-default="100" style="width: 100%;"/>')
                    .bind('input change', e => updateVideoFilters())
            ),
            $('<p/>').append(
                'Hue<br>',
                $('<input type="range" data-videofilter-field="hue" value="0" min="-180" max="180" data-default="0" style="width: 100%;"/>')
                    .bind('input change', e => updateVideoFilters())
            ),
            $('<label/>').append(
                $('<input type="checkbox" data-videofilter-field="flipX" data-default="0"/>')
                    .bind('input change', e => updateVideoFilters()),
                'Flip X<br>'
            ),
            $('<label/>').append(
                $('<input type="checkbox" data-videofilter-field="flipY" data-default="0"/>')
                    .bind('input change', e => updateVideoFilters()),
                'Flip Y'
            ),
            $('<button/>')
                .text('Reset filters')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(98,98,98,1) 0%, rgba(199,199,199,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {
                    e.preventDefault();
                    $('[data-videofilter-field]').each((i, el) => {
                        if ($(el).is('input[type="checkbox"]')) {
                            $(el).prop('checked', parseFloat($(el).attr('data-default')) == 1);
                        } else {
                            $(el).val(parseFloat($(el).attr('data-default')));
                        }
                    });
                    updateVideoFilters()
                }),
            $('<button/>')
                .text('Hide options')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px',
                    'background': 'linear-gradient(0deg, rgba(98,98,98,1) 0%, rgba(199,199,199,1) 100%)',
                    'color': '#ffffff',
                    'border-radius': '5px',
                    'border': 'none',
                    'padding': '4px',
                    'cursor': 'pointer',
                    'text-shadow': '0 1px 3px black'
                })
                .click(e => {
                    e.preventDefault();
                    $videoFilters.hide();
                })
        )
        .hide();


    function popOutChat() {

        const dossier = JSON.parse(initialRoomDossier);
        const win = window.open('', `Chat: ${dossier.broadcaster_username}`, `toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes,width=400,height=600`);

        if (win == null) return;

        win.document.body.parentElement.innerHTML = `<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>Chat: ${dossier.broadcaster_username}</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Arial', 'Helvetica', sans-serif;
                font-size: 11pt;
            }
            #container {
                position: relative;
            }
            #chat {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: calc(100vh - 50px);
                overflow-y: scroll;
                line-height: 150%;
            }
            #input {
                position: absolute;
                left: 0;
                top: calc(100vh - 50px);
            }
            .emojiChat {
                width: 1.3em;
                height: 1.3em;
                vertical-align: middle;
            }
        </style>
    </head>
    <body>
        <div id="container">
            <div id="chat"></div>
            <div id="input">
                <input type="text" autocomplete="off" spellcheck="false" id="_input_chat">
            </div>
        </div>
    </body>
</html>`;

        isChatPoppedOut = true;
        chatWindow = win;

    }

    /*
    function popOutChat() {

        if ($('[data-cbutils-chat-popout]').length == 0) {
            $('body').append(
                $('<div data-cbutils-chat-popout="true"/>')
                    .css({
                        'position': 'fixed',
                        'top': '100px',
                        'left': '100px',
                        'box-shadow': '3px 3px 15px rgba(0, 0, 0, 0.5)',
                        'width': `${$('#ChatTabContainer').width()}px`,
                        'height': `${$('#ChatTabContainer').height()}px`
                    })
            )
        }

        const $popout = $('[data-cbutils-chat-popout]');

        $('[data-cbutils-chat-popout]').append($('#ChatTabContainer'));
        $('#ChatTabContainer').css('width', '100%');
        $('#ChatTabContainer').css('position', 'relative');
        $('#ChatTabContainer').css('margin', '0').css('padding', '0');

        // fix the width
        function fixPopoutSize() {
            $('#ChatTabContainer').css('width', '100%');
            $('#ChatTabContainer').css('height', '');
            $('#ChatTabContainer').css('position', 'relative');
            $('#ChatTabContainer').css('margin', '0').css('padding', '0');
            $('#ChatTabContainer .window').css('height', `${$popout.height()-50}px`);
            $('#ChatTabContainer .msg-list-wrapper-split').css('height', `${$popout.height()-50}px`);
            $('#ChatTabContainer .chat-input-field, #ChatTabContainer .inputDiv').css('width', `calc(100% - 25px)`);
        }

        const observer = new MutationObserver(mut => fixPopoutSize());
        observer.observe($('#ChatTabContainer')[0], { attributes: true, attributeFilter: ['style'] });


    }
    */

    function updatePositions(settingsOnly = false) {

        let ballX = parseFloat($toolIcon.css('left'));
        let ballY = parseFloat($toolIcon.css('top'));

        if (!settingsOnly) {
            // main ball
            if (ballX >= window.innerWidth-50) {
                ballX = window.innerWidth-50;
            }
            if (ballY >= window.innerHeight-50) {
                ballY = window.innerHeight-50;
            }
            $toolIcon.css({
                'left': `${ballX}px`,
                'top': `${ballY}px`
            });
        }

        // settings
        const x = Math.min(
            ballX + 15,
            window.innerWidth - $settings.width() - 40
        );
        const y = Math.min(
            ballY + 15,
            window.innerHeight - $settings.height() - 40
        );
        $settings.css({
            'left': `${x}px`,
            'top': `${y}px`
        });

    }

    function settingChanged(settingId, settingValue) {

        settings[settingId] = settingValue;
        GM.setValue('utilSettings', JSON.stringify({...settings}))
            .then(() => console.log('saved settings'))
            .catch(() => console.error('save failed?'));

        if (settingId == 'enableFiltering') {
            if (settingValue) {
                $('.__x_non_user_message').hide();
            } else {
                $('.__x_non_user_message').show();
            }
        }

    }

    function savePos() {
        GM.setValue('iconPos', `${$toolIcon.css('left') ?? '0px'};${$toolIcon.css('top') ?? '0px'}`);
    }

    window.addEventListener('mousemove', e => {
        if (isDragging) {
            wasDragged = true;
            $toolIcon.css({
                left: `${Math.max(Math.min(window.innerWidth-30, e.clientX - $toolIcon.width()/2), 0)}px`,
                top: `${Math.max(Math.min(window.innerHeight-30, e.clientY - $toolIcon.height()/2), 0)}px`,
                right: ''
            });
            updatePositions(true);
            e.preventDefault();
        }
    });

    window.addEventListener('mouseup', e => {
        if (isDragging && wasDragged) lastDragged = Date.now();
        isDragging = false;
        wasDragged = false;
        updatePositions(true);
        savePos();
    });

    $(() => {

        $('body').append($toolIcon);
        $('body').append($settings);
        $('body').append($autotipper);
        $('body').append($videoFilters);
        window.addEventListener('resize', () => updatePositions());

        GM.getValue('iconPos', (window.innerWidth-50) + 'px;15px')
            .then(val => {
                let [px, py] = val.split(';').map(n => parseFloat(n));
                px = Math.max(Math.min(window.innerWidth-30, px), 0);
                py = Math.max(Math.min(window.innerHeight-30, py), 0);
                $toolIcon.css({
                    left: px + 'px',
                    top: py + 'px'
                });
                updatePositions();
            });

        document.querySelector('[data-cbutils-tool]').addEventListener('mousedown', e => {
            isDragging = true;
            e.preventDefault();
        });

        if (unsafeWindow.initialRoomDossier || window.location.href.indexOf('https://chaturbate.com/b/') == 0) {
            const iv = setInterval(() => {

                const chat = $('#ChatTabContents .message-list')[0];
                if (chat) {
                    clearInterval(iv);
                    onChatFound(chat);
                }

            }, 100);
        } else {
            $toolIcon.hide();
        }

    });

    function cloneWithStyles(base) {

        const cloneStyles = [
            'color', 'background', 'font-weight', 'font-family', 'display', 'margin-left', 'margin-right', 'padding-left', 'padding-right'
        ];

        const clone = base.cloneNode(false);
        const baseStyle = (() => {
            try {
                return unsafeWindow.getComputedStyle(base);
            } catch(err) {}
            return {};
        })();

        //if (baseStyle.cssText) clone.style.cssText = baseStyle.cssText;
        if (base.style) {
            clone.style.cssText = ``;
            for (const st of cloneStyles) {
                clone.style.setProperty(st, baseStyle.getPropertyValue(st));
            }
        }

        for (const ch of base.childNodes) clone.appendChild(cloneWithStyles(ch));

        return clone;

    }

    function onChatFound(chat){
        GM.getValue('utilSettings', '{}')
            .then(loadedSettings => {

                loadedSettings = JSON.parse(loadedSettings);
                for (const key in loadedSettings) {
                    settings[key] = loadedSettings[key];
                }

                for (const key in settings) {
                    const $inp = $settings.find(`[name="${key}"]`);
                    if ($inp.is('[type="checkbox"]')) {
                        $inp.prop('checked', !!settings[key]);
                    } else {
                        $inp.val(settings[key]);
                    }
                }

                const myNick = $('.user_information_header_username').text();

                chat.arrive('div.msg-text', chatElem => {

                    const $msg = $(chatElem).closest('.msg-text');
                    const text = $msg.text();

                    if (chatWindow && isChatPoppedOut) {

                        const cloneElem = cloneWithStyles(chatElem);
                        cloneElem.querySelectorAll('.isTip').forEach(el => el.style.padding = `2px 3px`);
                        cloneElem.style.margin = `0.5em 0`;

                        const _chat = chatWindow.document.querySelector('#chat');
                        _chat.appendChild(cloneElem);
                        _chat.scrollTop = _chat.scrollHeight;

                    }

                    // if the message is not related to a user
                    if (!$msg.is('[data-nick]')
                        && text.indexOf('removed') == -1
                        && text.indexOf('tipped for') == -1
                        && text.indexOf('says to mods') == -1
                        && text.toLowerCase().indexOf('whisper') == -1) {
                        if (settings.enableFade) {
                            $msg.css('opacity', '0.3').css('filter', 'grayscale(100%)');
                        }
                        $msg.addClass('__x_non_user_message');
                        if (settings.enableFiltering) {
                            $msg.hide();
                        }
                    }

                    if (settings.enableFade) {
                        if (text.indexOf('has joined the room') > -1 || text.indexOf('has left the room') > -1) {
                            $msg.css('opacity', '0.3');
                        }
                    }

                    if ($msg.find('.isTip').length > 0) {
                        // this is a tip
                    }

                    if (settings.enableTime) {
                        const d = new Date();
                        const timeText = `${d.getHours() < 10 ? '0'+d.getHours() : d.getHours()}:${d.getMinutes() < 10 ? '0'+d.getMinutes() : d.getMinutes()}:${d.getSeconds() < 10 ? '0'+d.getSeconds() : d.getSeconds()}`;
                        if ($msg.find('[dm-adjust-bg]').length > 0) {
                            $msg.find('[dm-adjust-bg] div')[0].prepend($(`<span style="color: #000000; display: inline-block; font-size: 7pt; font-weight: bold; opacity: 0.7; margin-right: 0.5em;">${timeText}</span>`)[0]);
                        } else {
                            $msg[0].prepend($(`<span style="color: #000000; display: inline-block; font-size: 7pt; font-weight: bold; opacity: 0.7; margin-right: 0.5em;">${timeText}</span>`)[0]);
                        }
                    }

                    if (settings.enableScrollFix) {
                        setTimeout(() => {
                            const $chat = $('.msg-list-wrapper-split[data-listener-count-scroll]');
                            $chat.scrollTop($chat[0].scrollHeight);
                        }, 1);
                    }

                });

            })
            .catch(err => {
                console.error(err);
                $toolIcon.css('background', 'red');
            })
    }

})();