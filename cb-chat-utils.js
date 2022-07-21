// ==UserScript==
// @name         CBUtils
// @version      0.2.0
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
                .text('Ok')
                .css({
                    'width': '100%',
                    'box-sizing': 'border-box',
                    'margin-top': '5px'
                })
                .click(e => {
                    e.preventDefault();
                    $settings.fadeOut(50);
                })
        )
        .hide();

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

        if (unsafeWindow.initialRoomDossier) {
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

                    // if the message is not related to a user
                    if (!$msg.is('[data-nick]') && text.indexOf('removed') == -1 && text.indexOf('tipped for') == -1) {
                        if (settings.enableFade) {
                            console.log('! fade');
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