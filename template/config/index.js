/**
 * @description 所有相关配置
 *
 * 以下路径配置时以config的父目录（项目根目录）路径为基础，不得使用相对路径
 * @date 2015/12/20
 */
(function (window, undefined) {
  var allConfig = {
    /**
     * 服务器的一些固定配置
     */
    url: {
      /**
       * 服务器根地址
       */
      server: 'http://wizard2.webdev.com',

      /**
       * 创建文件夹服务
       */
      newDir: '/cgi-bin/material/material_newdir?dir=',

      /**
       * 上传文件服务
       */
      upload: '/cgi-bin/material/material_new?dir=',

      /**
       * 上传html文件服务
       */
      htmlfileserver: '/edit/top.htm',

      /**
       * 修改已有旧文件的服务
       */
      htmlfileupdate: '/cgi-bin/edit/save_as?type=save',

      /**
       * 增加新文件的服务
       */
      htmlfileadd: '/cgi-bin/edit/save_over',

      /**
       * 搜索文件列表的服务
       */
      htmlfilelist: '/cgi-bin/leaf/search?',

      /**
       * 登陆到cms的地址
       */
      login: 'http://passport.webdev.com/cgi-bin/check_session?project=TCMS'
    },

    /**
     * cms频道名称
     */
    channelName: '<体育频道>',

    /**
     * cms频道id
     */
    channelId: 'sports',

    /**
     * 是否覆盖上传
     * @return true overwrite
     */
    overwrite: true,

    /**
     *  静态资源文件过滤
     *  正则表达式
     *  正则匹配对象是整个文件路径，如：'F:\\xxxx\\xxx\\xxx-cms\\xxx\\v001\\a.js'
     */
    staticResourcesFileFilter: [/\.htm/, /\.html/],

    /**
     * 静态资源映射到服务器的规则
     * key 是 本地资源文件夹地址, 请使用绝对路径或者命令行执行位置的相对路径
     * value 是 远程服务器静态资源文件夹地址,第一个字符不能是 /，后果自负
     * 另外，value还会决定 _toserver 时静态资源的地址。
     * 静态资源地址生成规则： serverUrl + channelId + {staticResourcesMapping.{value}}
     */
    staticResourcesMapping: {
      './__publish__': 'kbsweb/'
    },

    /**
     * 大分类，分类名称用于访问的子目录，如需测试，请在此栏目下创建此项目的测试目录
     * 决定 html 上传的路径
     * 目录名应该是 {catalog}test
     */
    catalog: 'fans',

    /**
     * 安全上传模式，会提示你已经存在同名文件，这时候，不能更新文件
     */
    htmlSafeAdd: false,

    /**
     * 上传到服务器等待的间隔，默认100毫秒
     */
    waitTime: 80,

    /**
     * 此字段由遍历程序自动生成，请勿手动配置，无效
     * { 'filename':'filecode'
     *  }
     */
    __htmls: {},

    /**
     * 此字段由遍历程序自动生成，请勿手动配置，无效
     * { 'serverurl/sharepage/':
        { '.': [ 'F:\\xxxx\\xxx\\xxx\\xxx\\xxx\\xx.js',
                 '... ],
           V01: [ 'F:\\xxx\\xxx\\xxx\\xx.js' ]
        }
    }
    */
    __files: {}
  };

  if (typeof module !== 'undefined' && module.exports !== '')
}).call(this);

