
export function fmtNormalXML (xml) {
    console.log('%c 🇹🇻 开发日志: fmtNormalXML -> xml ', 'font-size:16px;background-color:#a45f7f;color:white;', xml);
    const message = {}
  
    if (typeof xml === 'object') {
      const keys = Object.keys(xml)
  
      for (let i = 0; i < keys.length; i++) {
        const item = xml[keys[i]]
        const key = keys[i]
  
        if (!(item instanceof Array) || item.length === 0) {
          continue
        }
  
        if (item.length === 1) {
          const val = item[0]
  
          if (typeof val === 'object') {
            // message[key] = formatMessage(val)
          } else {
            message[key] = (val || '').trim()
          }
        } else {
          message[key] = []
  
          for (let j = 0; j < item.length; j++) {
            // message[key].push(formatMessage(item[j]))
          }
        }
      }
    }
  
    return message
  }
  