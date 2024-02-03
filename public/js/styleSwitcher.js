function addSwitcher()
{
	var dlabSwitcher='';
	
	
	var demoPanel='<div class="dlab-demo-panel"> <div class="dlab-demo-inner"> <a href="javascript:void(0);" class="btn btn-primary btn-sm px-2 py-1 mb-3" onclick="deleteAllCookie()">Delete All Cookie</a> <div class="dlab-demo-header"> <h4>Select A Demo</h4> <a class="dlab-demo-close" href="javascript:void(0)"><span><i class="las la-times"></i></span></a> </div><div class="dlab-demo-content"> <div class="dlab-wrapper row"><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx demo-active"> <div class="overlay-wrapper"><img src="images/demo/pic1.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="1" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 1</a></div></div><h5 class="text-white mb-3">Demo 1</h5></div><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx"> <div class="overlay-wrapper"><img src="images/demo/pic2.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="2" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 2</a></div></div><h5 class="text-white mb-3">Demo 2</h5> </div><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx"> <div class="overlay-wrapper "><img src="images/demo/pic3.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="3" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 3</a></div></div><h5 class="text-white mb-3">Demo 3</h5> </div><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx"> <div class="overlay-wrapper"><img src="images/demo/pic4.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="4" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 4</a></div></div><h5 class="text-white mb-3">Demo 4</h5> </div><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx"> <div class="overlay-wrapper"><img src="images/demo/pic5.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="5" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 5</a></div></div><h5 class="text-white mb-3">Demo 5</h5></div><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx"> <div class="overlay-wrapper"><img src="images/demo/pic6.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="6" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 6</a></div></div><h5 class="text-white mb-3">Demo 6</h5></div><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx"> <div class="overlay-wrapper"><img src="images/demo/pic7.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="7" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 7</a></div></div><h5 class="text-white mb-3">Demo 7</h5></div><div class="col-xl-3 col-md-6 mb-4"><div class="overlay-bx dlab-demo-bx"> <div class="overlay-wrapper"><img src="images/demo/pic8.jpg" alt="" class="w-100"></div><div class="overlay-layer"><a href="javascript:void(0)" data-theme="8" class="btn dlab_theme_demo btn-secondary btn-sm mr-2">Demo 8</a></div></div><h5 class="text-white mb-3">Demo 8</h5></div></div></div><div class="note-text"><span class="text-danger">*Note :</span> This theme switcher is not part of product. It is only for demo. you will get all guideline in documentation. please check <a href="https://getskills.dexignzone.com/doc" target="_blank" class="text-primary">documentation.</a></div></div></div>';
	
	if($("#dlabSwitcher").length == 0) {
		jQuery('body').append(dlabSwitcher+demoPanel);
		

	}
}

(function($) {

	addSwitcher();

	


    
	
	




    //change the sidebar style controller
    sidebarStyleSelect.on('change', function() {
        if(body.attr('data-layout') === "horizontal") {
            if(this.value === "overlay") {
                alert("Sorry! Overlay is not possible in Horizontal layout.");
                return;
            }
        }


        body.attr('data-sidebar-style', this.value);

         if(body.attr('data-sidebar-style') === 'icon-hover') {
            $('.dlabnav').on('hover',function() {
			$('#main-wrapper').addClass('iconhover-toggle'); 
            }, function() {
			$('#main-wrapper').removeClass('iconhover-toggle'); 
            });
        } 
		
		setCookie('sidebarStyle', this.value);
	});

})(jQuery);
