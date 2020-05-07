export function fmtNormalXML(xml) {
  /* xml 的格式为
    {
      ToUserName: [ 'gh_4e4caf62ccfe' ],
      FromUserName: [ 'o2wqAs_t5JpM7P6-qmXSr_DEjtqs' ],
      CreateTime: [ '1588868187' ],
      MsgType: [ 'event' ],
      Event: [ 'subscribe' ],
      EventKey: [ '' ]
    }
  */
  const message = {};

  if (typeof xml === 'object') {
    const keys = Object.keys(xml);

    for (let i = 0; i < keys.length; i++) {
      const item = xml[keys[i]];
      const key = keys[i];

      // 如果value值非数组，或者数组长度为0，直接跳到下一个key
      if (!(item instanceof Array) || item.length === 0) {
        continue;
      }

      // 如果item的长度为1
      if (item.length === 1) {
        // 直接取了数组的第1项
        const val = item[0];

        // 如果第一项是个对象?
        if (typeof val === 'object') {
          // TODO 对于对象不知该如何处理，formatMessage此处是个undefined，需要等遇到val是object的时候看下如何处理
          // message[key] = formatMessage(val)
        } else {
          // 这里判断type进行trim是不严谨的，比如true就会报错
          // 但是估计value值是以字符串为主的
          message[key] = (val || '').trim();
        }
      } else {
        // 如果value值的数组长度大于1
        message[key] = [];

        for (let j = 0; j < item.length; j++) {
          // message[key].push(formatMessage(item[j]))
        }
      }
    }
  }

  return message;
}
