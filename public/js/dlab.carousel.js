/* JavaScript Document */


function dlabSliders(){
	
	if(jQuery('.testimonial-one').length > 0){
		jQuery('.testimonial-one').owlCarousel({
			loop:true,
			autoplay:true,
			margin:20,
			nav:false,
			rtl:true,
			dots: false,
			navText: ['', ''],
			responsive:{
				0:{
					items:3
				},
				450:{
					items:4
				},
				600:{
					items:5
				},	
				991:{
					items:5
				},			
				
				1200:{
					items:7
				},
				1601:{
					items:5
				}
			}
		})
	}
	
	if(jQuery('.cards-slider').length > 0){
		jQuery('.cards-slider').owlCarousel({
			loop:false,
			margin:30,
			nav:true,
			rtl:(getUrlParams('dir') == 'rtl')?true:false,
			autoWidth:true,
			//rtl:true,
			dots: false,
			navText: ['', ''],
		})
	}
	
	if(jQuery('.front-view-slider').length > 0){
		jQuery('.front-view-slider').owlCarousel({
			loop:false,
			margin:30,
			nav:true,
			autoplaySpeed: 3000,
			navSpeed: 3000,
			paginationSpeed: 3000,
			slideSpeed: 3000,
			smartSpeed: 3000,
			autoplay: false,
			animateOut: 'fadeOut',
			dots:true,
			navText: ['', ''],
			responsive:{
				0:{
					items:1
				},
				
				480:{
					items:1
				},			
				
				767:{
					items:2
				},
				1750:{
					items:3
				}
			}
		})
	}
	if(jQuery('.course-slider').length > 0){
		var swiperTestimonial4 = new Swiper('.course-slider', {
			speed: 1500,
			parallax: true,
			slidesPerView:4,
			spaceBetween: 20,
			loop:false,
			breakpoints: {
				1600: {
					slidesPerView: 4,
				},
				
				1200: {
					slidesPerView: 3,
				},
				575: {
					slidesPerView: 2,
				},
				360: {
					slidesPerView: 1,
				},
			}
			
		});
	}
	
}


jQuery(window).on('load',function(){
	setTimeout(function(){
		dlabSliders();
	}, 1000); 
});
/* Document .ready END */