const app = getApp();
import regeneratorRuntime from '../../libs/runtime'; //在es6转es5的同时 使用async/await新特性
import Notify from '../../miniprogram_npm/@vant/weapp/notify/notify';
var util = require('../../utils/util.js'); //引入util类计算日期 
var QQMapWX = require('../../libs/qqmap-wx-jssdk.js'); // 引入SDK核心类 实例化API核心类
var qqmapsdk = new QQMapWX({
  key: 'ND6BZ-NKOCX-ZS34B-ZKTED-HTCLJ-ZDBOB' // 必填
});
//map组件基本设置
var mapSetting = {
  subkey: 'ND6BZ-NKOCX-ZS34B-ZKTED-HTCLJ-ZDBOB',
  longitude: 106.301919,
  latitude: 29.603818,
  scale: 12,
  layerStyle: 1,
  showLocation: true,
};

Page({
  data: {
    //schedule settings
    showSetting: false,
    name: '',
    from: '',
    calendarSet: false,
    nameSet: false,

    //calendar
    showCalendar: false,
    minDate: new Date(2021, 4, 7).getTime(),
    maxDate: new Date(2021, 11, 31).getTime(),
    defaultDate: util.formatDate(new Date()),

    //date info
    date: "",

    //AllDatesData
    allDatesData: [],
    listData: [],
    polyline: [],
    logAndLats: [],
    count: 0,

    //map data
    mapSetting: mapSetting,

    //subPage data
    showSubPage: true,

    //mainPage data
    showSelect: false,

    //wxp-drag data
    isIphoneX: app.globalData.isIphoneX,
    size: 1,
    scrollTop: 0,
    pageMetaScrollTop: 0,

    //nav data
    activeTag: 0,
    tmpDay: 0,
    totalDay: 1,

  },
  //上传新行程
  //调用云函数存入数据库
  //unfinished 天数改变时 如果是更新的话要自动改变默认的date 
  //此处懒人设置法：天数改变时 将date设置为''
  add_a_day() {
    let allDatesData = this.data.allDatesData;
    allDatesData.push({
      listData: [],
      polyline: [],
      logAndLats: [],
      count: 0,
    })
    let tmpDay = this.data.tmpDay + 1;
    let totalDay = this.data.totalDay + 1;
    this.onTagClick({
      detail: {
        index: tmpDay
      }
    })
    if (this.data.date == '') {
      this.setData({
        totalDay,
        allDatesData,
        tmpDay,
      })
    } else {
      this.setData({
        totalDay,
        allDatesData,
        tmpDay,
        date:'',
      })
    }

    this.selectComponent('#tabs').resize();
  },
  delete_today() {
    //total day must be bigger than 1 
    if (this.data.totalDay > 1) {
      let allDatesData = this.data.allDatesData;
      let tmpDay = this.data.tmpDay;
      let totalDay = this.data.totalDay - 1;
      allDatesData.splice(tmpDay, 1);
      if (tmpDay == totalDay) {
        tmpDay--;
      }
      let listData = allDatesData[tmpDay].listData;
      let polyline = allDatesData[tmpDay].polyline;
      let logAndLats = allDatesData[tmpDay].logAndLats;
      let count = allDatesData[tmpDay].count;
      if(this.data.date==''){
        this.setData({
          listData,
          polyline,
          logAndLats,
          count,
          allDatesData,
          totalDay,
          tmpDay,
        })
      }else{
        this.setData({
          listData,
          polyline,
          logAndLats,
          count,
          allDatesData,
          totalDay,
          tmpDay,
          date:'',
        })
      }
      
      this.selectComponent('#tabs').resize();
      this.drag.init();
      this.FUCKYOUWXSHITAPI()
    }
  },
  //显示保存页面
  show_setting() {
    wx.showLoading({
      title: '正在保存',
    })
    //save today's data to allDatesData
    let thisDayData = {
      listData: this.data.listData,
      polyline: this.data.polyline,
      logAndLats: this.data.logAndLats,
      count: this.data.count,
    }
    this.setData({
      [`allDatesData[${this.data.tmpDay}]`]: thisDayData,
      showSetting: true,
    })
    wx.hideLoading()
  },
  //返回形成页面
  onClickLeft() {
    this.setData({
      showSetting: false,
      calendarSet: false,
      date: '',
    })
    this.drag = this.selectComponent('#drag');
  },
  onLoad: function (options) {
    console.log('@@options', options)
    this.drag = this.selectComponent('#drag');
    const eventChannel = this.getOpenerEventChannel()
    // 判断是否有once属性 即从wx.navigateTo接口传过来的
    if (eventChannel.once) {
      // discover schedule / mine schedule initialize
      eventChannel.once('acceptFromOpener', (data) => {
        if (data.from == 'mine') {
          console.log('@@FROM MINE', data)
          wx.cloud.callFunction({
            name: 'scheduleByID',
            data: {
              scheduleID: data.id,
            },
            success: res => {
              console.log('@@SUCCESS', res)
              this.setData({
                allDatesData: res.result.allDatesData,
                listData: res.result.allDatesData[0].listData,
                polyline: res.result.allDatesData[0].polyline,
                logAndLats: res.result.allDatesData[0].logAndLats,
                count: res.result.allDatesData[0].count,
                name: res.result.name,
                date: res.result.date,
                defaultDate:res.result.beginDate,
                totalDay: res.result.allDatesData.length,
                mineID: data.id,
                from: "mine",
                calendarSet: true,
                nameSet: true,
                showSubPage:false,
              })
              this.drag.init();
              this.selectComponent('#tabs').resize();
            },
            fail: err => {
              console.log('@@ERR', err)
            }
          })
        } else if (data.from == 'discover') {
          console.log('@@FROM DISCOVER', data)
          wx.cloud.callFunction({
            name: 'discoverScheduleByID',
            data: {
              scheduleID: data.id,
            },
            success: res => {
              console.log('@@SUCCESS', res)
              this.setData({
                discoverID: res.result._id,
                allDatesData: res.result.allDatesData,
                listData: res.result.allDatesData[0].listData,
                polyline: res.result.allDatesData[0].polyline,
                logAndLats: res.result.allDatesData[0].logAndLats,
                count: res.result.allDatesData[0].count,
                name: res.result.name,
                totalDay: res.result.days,
                from: 'discover',
                nameSet: true,
                showSubPage:false,
              })
              this.drag.init();
              this.selectComponent('#tabs').resize();
            },
            fail: err => {
              console.log('@@ERR', err)
            }
          })
        }
      })
    } else if (options.id) {
      //行程分享单
      console.log('@@FROM SHARE', options)
      wx.cloud.callFunction({
        name: 'scheduleByID',
        data: {
          scheduleID: options.id,
        },
        success: res => {
          console.log('@@SUCCESS', res)
          this.setData({
            allDatesData: res.result.allDatesData,
            listData: res.result.allDatesData[0].listData,
            polyline: res.result.allDatesData[0].polyline,
            logAndLats: res.result.allDatesData[0].logAndLats,
            count: res.result.allDatesData[0].count,
            name: res.result.name,
            date: res.result.date,
            defaultDate:res.result.beginDate,
            totalDay: this.getDaysBetween(res.result.beginDate, res.result.endDate),
            from: 'share',
            nameSet: true,
            dateSet:true,
          })
          this.drag.init();
          this.selectComponent('#tabs').resize();
          this.FUCKYOUWXSHITAPI();
        },
        fail: err => {
          console.log('@@ERR', err)
        }
      })

    } else {
      //"add schedule" initialize
      console.log('@@NEW SCHEDULE')
      let allDatesData = this.data.allDatesData
      allDatesData.push({
        listData: [],
        polyline: [],
        logAndLats: [],
        count: 0,
      })
      this.setData({
        allDatesData,
        tmpDay: 0,
        totalDay: 1,
        from: 'new',
        showSubPage:false,
      })
    }
  },
  onShow: function () {},
  onReady: function () {},
  onUnload: function () {},
  onNameChange() {
    if (this.data.name != '') {
      this.setData({
        nameSet: true,
      })
    } else {
      this.setData({
        nameSet: false,
      })
    }
  },
  onCalendarDisplay() {
    this.setData({
      showCalendar: true
    });
  },
  onCalendarClose() {
    this.setData({
      showCalendar: false
    });
  },
  getDaysBetween(dateString1, dateString2) {
    var startDate = Date.parse(dateString1);
    var endDate = Date.parse(dateString2);
    if (startDate > endDate) {
      return 0;
    }
    if (startDate == endDate) {
      return 1;
    }
    var days = (endDate - startDate) / (1 * 24 * 60 * 60 * 1000) + 1;
    return days;
  },
  onCalendarConfirm(e) {
    console.log(e)
    const date = e.detail;
    let dateS = util.formatDate(new Date(date));
    let secs = Date.parse(date) + (this.data.totalDay == 1 ? 0 : this.data.totalDay - 1) * (1 * 24 * 60 * 60 * 1000);
    let dateE = new Date();
    dateE.setTime(secs);
    dateE = util.formatDate(dateE);
    this.setData({
      calendarSet: true,
      showCalendar: false,
      date: dateS + ' - ' + dateE,
    });
  },
  confirm_setting() {
    wx.showLoading({
      title: '上传中',
    })
    //call cloudFunc
    wx.cloud.callFunction({
      name: 'uploadNewSchedule',
      data: {
        //DateFormate: yyyy-mm-dd - yyyy-mm-dd
        name: this.data.name,
        date: this.data.date,
        allDatesData: this.data.allDatesData,
      },
      success: res => {
        console.log('@@success', res)
        wx.hideLoading()
        if (res.result) {
          Notify({
            type: 'success',
            message: '保存成功'
          });
          //如果是加载的他人行程的保存成功的话 该行程收藏数加1
          if (this.data.from == "discover") {
            wx.cloud.callFunction({
              name: 'scheduleStar',
              data: {
                scheduleID: this.data.discoverID
              },
            })
            wx.showToast({
              title: '保存成功',
              icon: 'success',
              duration: 3000,
              complete: end => {
                console.log('@@swtichToDiscover')
                setTimeout(() => {
                  wx.switchTab({
                    url: '/pages/discover/discover',
                  })
                }, 2000);
              }
            })
          } else {
            wx.showToast({
              title: '保存成功',
              icon: 'success',
              duration: 3000,
              complete: end => {
                console.log('@@swtichToMyMap', this.data.date.split(' - ', 1)[0])
                app.globalData.date = this.data.date.split(' - ', 1)[0],
                  setTimeout(() => {
                    wx.switchTab({
                      url: '/pages/myMap/myMap',
                    })
                  }, 2000);
              }
            })
          }
        } else {
          Notify({
            type: 'danger',
            message: '日期与现有行程冲突'
          });
        }
      },
      fail: err => {
        console.log('@@err', err)
        wx.hideLoading()
      },
    })
  },
  update_setting() {
    //call cloudFunc
    console.log(this.data.mineID)
    wx.showLoading({
      title: '更新中',
    })
    wx.cloud.callFunction({
      name: 'updateSchedule',
      data: {
        scheduleID: this.data.mineID,
        name: this.data.name,
        date: this.data.date,
        allDatesData: this.data.allDatesData,
      },
      success: res => {
        wx.hideLoading()
        console.log('@@UPDATE SUCCESS', res)
        if (res.result) {
          Notify({
            type: 'success',
            message: '更新成功！'
          });
          wx.showToast({
            title: '更新成功',
            icon: 'success',
            duration: 3000,
            complete: end => {
              console.log('@@swtichToMine')
              setTimeout(function () {
                wx.switchTab({
                  url: '/pages/mine/mine',
                })
              }, 2000)
            }
          })
        } else {
          Notify({
            type: 'danger',
            message: '日期与现有行程冲突'
          });
        }
      },
      fail: err => {
        console.log('@@UPDATE ERR', err)
        wx.hideLoading()
      },
    })
  },
  //FUCK THIS SHITTYSHIT!
  //switch to tmpDay and reload infos
  FUCKYOUWXSHITAPI() {
    let MapContext = wx.createMapContext("map");
    MapContext.includePoints({
      points: this.data.logAndLats,
      padding: [80, 80, 80, 80, ],
    })
  },
  onTagClick(e) {
    // console.log(e)
    if (this.data.tmpDay != e.detail.index) {
      // console.log("@@@from " + this.data.tmpDay + " going to " + e.detail.index)
      let thisDayData = {
        listData: this.data.listData,
        polyline: this.data.polyline,
        logAndLats: this.data.logAndLats,
        count: this.data.count,
      }
      this.setData({
        [`allDatesData[${this.data.tmpDay}]`]: thisDayData,
        listData: this.data.allDatesData[e.detail.index].listData,
        polyline: this.data.allDatesData[e.detail.index].polyline,
        logAndLats: this.data.allDatesData[e.detail.index].logAndLats,
        count: this.data.allDatesData[e.detail.index].count,
        tmpDay: e.detail.index,
      })
      this.drag.init();
      // console.log(this.data.allDatesData, this.data.listData, this.data.polyline, this.data.logAndLats)

      //refresh include points
      let MapContext = wx.createMapContext("map");
      MapContext.includePoints({
        points: this.data.logAndLats,
        padding: [80, 80, 80, 80, ],
      })
    }
  },
  load_yesterday: function () {
    this.onTagClick({
      detail: {
        index: this.data.tmpDay - 1,
      }
    })
  },
  load_tomorrow: function () {
    this.onTagClick({
      detail: {
        index: this.data.tmpDay + 1,
      }
    })
  },
  //触发关键词输入提示事件
  get_suggestion: function (e) {
    if (e.detail == '') {
      this.setData({
        suggestion: [],
        chosenLocation: '',
        showSelect: false,

      })
      return;
    }
    var _this = this;
    //调用关键词提示接口
    qqmapsdk.getSuggestion({
      //获取输入框值并设置keyword参数
      keyword: e.detail, //用户输入的关键词，可设置固定值,如keyword:'KFC'
      //region:'北京', //设置城市名，限制关键词所示的地域范围，非必填参数
      success: function (res) { //搜索成功后的回调
        // console.log(res);
        var sug = [];
        for (var i = 0; i < res.data.length; i++) {
          sug.push({ // 获取返回结果，放到sug数组中
            title: res.data[i].title,
            id: res.data[i].id,
            addr: res.data[i].address,
            city: res.data[i].city,
            district: res.data[i].district,
            latitude: res.data[i].location.lat,
            longitude: res.data[i].location.lng
          });
        }
        _this.setData({ //设置suggestion属性，将关键词搜索结果以列表形式展示
          suggestion: sug,
          showSelect: true,
        });
      },
      fail: function (error) {
        console.error(error);
      },
      complete: function (res) {
        console.log(res);
      }
    });
  },
  clear_search() {
    this.setData({
      suggestion: [],
      chosenLocation: '',
      showSelect: false
    })
  },
  add_location(e) {
    // console.log(this.data.listData)
    let id = e.currentTarget.id;
    for (var i = 0; i < this.data.suggestion.length; i++) {
      if (i == id) {
        //加入到listData数组
        let listData = this.data.listData;
        let logAndLats = this.data.logAndLats;

        logAndLats.push({
          latitude: this.data.suggestion[i].latitude,
          longitude: this.data.suggestion[i].longitude,
        })
        listData.push({
          //drag data
          dragId: `item${this.data.count}`,
          title: this.data.suggestion[i].title,
          description: this.data.suggestion[i].addr,
          picList: [],
          fixed: false,

          //markers data
          sortKey: this.data.listData.length,
          id: this.data.count++,
          longitude: this.data.suggestion[i].longitude,
          latitude: this.data.suggestion[i].latitude,
          width: 48,
          height: 50,
          iconPath: '../../resources/icons8-home-address-64.png', //图标路径
          callout: {
            content: (this.data.listData.length + 1).toString(),
            fontSize: 14,
            color: '#663300',
            textAlign: 'center',
            borderRadius: 100,
            bgColor: '#ffffff',
            padding: 6,
            display: "ALWAYS", //显示方式，可选值BYCLICK
            anchorX: 0, //横向偏移
            anchorY: 33.5,
          },
        });
        if (logAndLats.length > 1) {
          this.setData({
            polyline: [{
              points: logAndLats,
              color: '#ff6699',
              width: 8,
              arrowLine: true,
            }],
            listData: listData,
            logAndLats: logAndLats,
            showSelect: false,
            chosenLocation: '',
          });
        } else {
          this.setData({
            listData: listData,
            logAndLats: logAndLats,
            showSelect: false,
            chosenLocation: '',
          });
        }
        this.drag.init();
        break;
      }
    }
    // 查找不到id对应suggestion的处理
    // console.log("@@@Error:CAN NOT FIND THE SUGGESTION)
    console.log("afterAdded", this.data.listData, this.data.polyline, this.data.logAndLats)
  },
  show_onMap(e) {
    this.add_location(e)
    this.setData({
      showSubPage: true,
    })
  },
  //wxp-drag func
  sortEnd(e) {
    console.log("sortEnd", e.detail.listData)
    let listData = e.detail.listData;
    let logAndLats = [];
    //reset sortKey & polyline
    for (let i = 0; i < listData.length; i++) {
      listData[i].sortKey = i;
      listData[i].callout.content = (i + 1).toString();
      logAndLats.push({
        longitude: listData[i].longitude,
        latitude: listData[i].latitude,
      });
    }
    this.setData({
      listData,
      polyline: [{
        points: logAndLats,
        color: '#ff4d4d',
        width: 8,
        arrowLine: true,
      }],
      logAndLats,
    });
    console.log("afterResetKey", listData);
  },
  itemDelete(e) {
    console.log("delete", e)
    let listData = this.data.listData;
    let logAndLats = this.data.logAndLats;
    listData.splice(e.detail.key, 1);
    logAndLats.splice(e.detail.key, 1);
    //reset sortKey
    for (let i = e.detail.key; i < listData.length; i++) {
      listData[i].sortKey--;
      listData[i].callout.content = (i + 1).toString();
    }
    setTimeout(() => {
      if (logAndLats.length > 1) {
        this.setData({
          listData,
          polyline: [{
            points: logAndLats,
            color: '#ff4d4d',
            width: 8,
            arrowLine: true,
          }],
          logAndLats,
        });
      } else {
        this.setData({
          listData,
          logAndLats,
        });
      }
      this.drag.init();
    }, 300)
    console.log("afterDelete", listData)
  },
  //link to edit Page and get edited data
  itemClick(e) {
    console.log(e)
    let _this = this;
    wx.navigateTo({
      url: '/pages/edit/edit',
      events: {
        acceptChangedData: function (data) {
          console.log(data)
          _this.setData({
            [`listData[${e.detail.key}].picList`]: data.picList,
            [`listData[${e.detail.key}].description`]: data.description,
          })
          _this.drag.init()
        }
      },
      success: function (res) {
        res.eventChannel.emit('acceptOriginalData', {
          title: e.detail.data.title,
          description: e.detail.data.description,
          picList: e.detail.data.picList,
        })
      },
    })
    console.log(e);
  },
  change(e) {
    console.log("change", e.detail.listData)
  },
  sizeChange(e) {
    wx.pageScrollTo({
      scrollTop: 0
    })
    this.setData({
      size: e.detail.value
    });
    this.drag.columnChange();
  },
  toggleFixed(e) {
    let key = e.currentTarget.dataset.key;
    let {
      listData
    } = this.data;
    listData[key].fixed = !listData[key].fixed
    this.setData({
      listData: listData
    });
  },
  scroll(e) {
    this.setData({
      pageMetaScrollTop: e.detail.scrollTop
    })
  },
  // 页面滚动
  onDragScroll(e) {
    this.setData({
      scrollTop: e.detail.scrollTop,
    });
  },
  //subPage func
  show_subpage() {
    this.setData({
      showSubPage: true,
    })
  },
  exit_subpage() {
    this.setData({
      showSubPage: false
    })
  },
})