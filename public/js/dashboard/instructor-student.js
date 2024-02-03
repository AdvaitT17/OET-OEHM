

(function($) {
    /* "use strict" */
	
 var dlabChartlist = function(){
	 
	var screenWidth = $(window).width();
	
	
		var NewCustomers = function() {
            var options = {
                series: [{
                    name: 'Net Profit',
                    data: [100, 300, 100, 400, 200, 400],
                }, ],
                chart: {
                    type: 'line',
                    height: 100,
                    width: 120,
                    toolbar: {
                        show: false,
                    },
                    zoom: {
                        enabled: false
                    },
                    sparkline: {
                        enabled: true
                    }
                },
                colors: ['#ffff'],
                dataLabels: {
                    enabled: false,
                },
                legend: {
                    show: false,
                },
                stroke: {
                    show: true,
                    width: 3,
                    curve: 'smooth',
                    colors: ['#fff'],
                },
                grid: {
                    show: true,
                    borderColor: 'rgba(255,255,255,.3)',
                    padding: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    },
					yaxis: {
						lines: {
							show: true
						}
					},  
					xaxis: {
						lines: {
							show: true
						}
					},   
                },
                states: {
                    normal: {
                        filter: {
                            type: 'none',
                            value: 0
                        }
                    },
                    hover: {
                        filter: {
                            type: 'none',
                            value: 0
                        }
                    },
                    active: {
                        allowMultipleDataPointsSelection: false,
                        filter: {
                            type: 'none',
                            value: 0
                        }
                    }
                },
                xaxis: {
                    categories: ['Jan', 'feb', 'Mar', 'Apr', 'May'],
                    axisBorder: {
                        show: true,
                    },
                    axisTicks: {
                        show: false
                    },
                    labels: {
                        show: false,
                        style: {
                            fontSize: '12px',
                        }
                    },
                    crosshairs: {
                        show: false,
                        position: 'front',
                        stroke: {
                            width: 1,
                            dashArray: 3
                        }
                    },
                    tooltip: {
                        enabled: true,
                        formatter: undefined,
                        offsetY: 0,
                        style: {
                            fontSize: '12px',
                        }
                    }
                },
                yaxis: {
                    show: false,
                },
                fill: {
                    opacity: 1,
                    colors: '#FB3E7A'
                },
                tooltip: {
                    enabled: false,
                    style: {
                        fontSize: '12px',
                    },
                    y: {
                        formatter: function(val) {
                            return "$" + val + " thousands"
                        }
                    }
                },
				responsive: [{
					breakpoint: 1601,
					options: {
						chart: {
							width:'100%'
						},
					}
				}]
            };
            var chartBar1 = new ApexCharts(document.querySelector("#NewCustomers"), options);
            chartBar1.render();
        }
		
		var NewCustomers2 = function() {
				var options = {
                series: [{
                    name: 'Net Profit',
                    data: [100, 300, 100, 400, 200, 400],
                }, ],
                chart: {
                    type: 'area',
                    height: 100,
                    width: 120,
                    toolbar: {
                        show: false,
                    },
                    zoom: {
                        enabled: false
                    },
                    sparkline: {
                        enabled: true
                    }
                },
                colors: ['var(--secondary)'],
                dataLabels: {
                    enabled: false,
                },
                legend: {
                    show: false,
                },
                stroke: {
                    show: true,
                    width: 3,
                    curve: 'smooth',
                    colors: ['var(--secondary)'],
                },
                grid: {
                    show: false,
                    borderColor: '#DBDBDB',
                    padding: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    },
					yaxis: {
						lines: {
							show: false
						}
					},  
					xaxis: {
						lines: {
							show: false
						}
					},   
                },
                states: {
                    normal: {
                        filter: {
                            type: 'none',
                            value: 0
                        }
                    },
                    hover: {
                        filter: {
                            type: 'none',
                            value: 0
                        }
                    },
                    active: {
                        allowMultipleDataPointsSelection: false,
                        filter: {
                            type: 'none',
                            value: 0
                        }
                    }
                },
                xaxis: {
                    categories: ['Jan', 'feb', 'Mar', 'Apr', 'May'],
                    axisBorder: {
                        show: true,
                    },
                    axisTicks: {
                        show: false
                    },
                    labels: {
                        show: false,
                        style: {
                            fontSize: '12px',
                        }
                    },
                    crosshairs: {
                        show: false,
                        position: 'front',
                        stroke: {
                            width: 1,
                            dashArray: 3
                        }
                    },
                    tooltip: {
                        enabled: true,
                        formatter: undefined,
                        offsetY: 0,
                        style: {
                            fontSize: '12px',
                        }
                    }
                },
                yaxis: {
                    show: false,
                },
                fill: {
					type: 'gradient',
					colors: 'var(--secondary)',
					gradient: {
						shade: 'light',
						shadeIntensity: 0.5,
						gradientToColors: undefined,
						inverseColors: true,
						opacityFrom: 1,
						opacityTo: 1,
						stops: [0, 50, 100],
						colorStops: [[
							{
							  offset: 0,
							  color: 'var(--secondary)',
							  opacity: .5
							},
							{
							  offset: 0.5,
							  color: 'var(--secondary)',
							  opacity: .3
							},
							{
							  offset: 100,
							  color: '#fff',
							  opacity: 1
							}
						  ]]
					},
                },
                tooltip: {
                    enabled: false,
                    style: {
                        fontSize: '12px',
                    },
                    y: {
                        formatter: function(val) {
                            return "$" + val + " thousands"
                        }
                    }
                },
				responsive: [{
					breakpoint: 1601,
					options: {
						chart: {
							width:'100%'
						},
					}
				}]
            };
            var chartBar1 = new ApexCharts(document.querySelector("#NewCustomers2"), options);
            chartBar1.render();
        }
		
		var studentsActivity = function(){
		var optionsArea = {
          series: [{
            name: "",
			data: [20, 60, 30, 45]
          },
		  {
            name: "",
            data: [20, 10, 70, 45]
          }
        ],
          chart: {
          height: 150,
          type: 'line',
		  group: 'social',
		  toolbar: {
            show: false
          },
          zoom: {
            enabled: false
          },
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [5, 5],
		  colors:['#4CBC9A','var(--primary)'],
		  curve: 'smooth'
        },
        legend: {
			show:false,
          tooltipHoverFormatter: function(val, opts) {
            return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
          },
		  markers: {
			fillColors:['#C046D3','var(--primary)','#FF9432'],
			width: 16,
			height: 16,
			strokeWidth: 0,
			radius: 20
		  }
        },
        xaxis: {
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		  labels: {
			show: false,  
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		  axisBorder:{
			  show: false,
		  }
        },
		yaxis: {
			show: false,	
			labels: {
			
			offsetX:-16,
			minWidth:40,
			style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		},
		
		colors:['#1EA7C5','#FF9432'],
        grid: {
          borderColor: '#f1f1f1',
		  xaxis: {
            lines: {
              show: true
            }
          },
		  yaxis: {
            lines: {
              show: false
            }
          },
        },
		 responsive: [{
			breakpoint: 1601,
			options: {
				chart: {
					height:200
				},
			}
		}]
        };
		var chartArea = new ApexCharts(document.querySelector("#studentsActivity"), optionsArea);
        chartArea.render();

	}
       
		
	
	
	 
	
 
	/* Function ============ */
	return {
		init:function(){
		},
		
		
		load:function(){
			NewCustomers();
			NewCustomers2();
			studentsActivity();
		},
		
		resize:function(){
		}
	}

}();

jQuery(window).on('load',function(){
	setTimeout(function(){
		dlabChartlist.load();
	}, 1000); 
	
});

})(jQuery);