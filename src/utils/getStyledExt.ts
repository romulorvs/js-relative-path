var letters = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
// var stylized = ["𝘢", "𝘣", "𝘤", "𝘥", "𝘦", "𝘧", "𝘨", "𝘩", "𝘪", "𝘫", "𝘬", "𝘭", "𝘮", "𝘯", "𝘰", "𝘱", "𝘲", "𝘳", "𝘴", "𝘵", "𝘶", "𝘷", "𝘸", "𝘹", "𝘺", "𝘻"];
var stylized = ["𝑎", "𝑏", "𝑐", "𝑑", "𝑒", "𝑓", "𝑔", "ℎ", "𝑖", "𝑗", "𝑘", "𝑙", "𝑚", "𝑛", "𝑜", "𝑝", "𝑞", "𝑟", "𝑠", "𝑡", "𝑢", "𝑣", "𝑤", "𝑥", "𝑦", "𝑧"];
// var stylized = ["𝑨", "𝑩", "𝑪", "𝑫", "𝑬", "𝑭", "𝑮", "𝑯", "𝑰", "𝑱", "𝑲", "𝑳", "𝑴", "𝑵", "𝑶", "𝑷", "𝑸", "𝑹", "𝑺", "𝑻", "𝑼", "𝑽", "𝑾", "𝑿", "𝒀", "𝒁"];

var fonts: {[key: string]: string} = {};
letters.forEach(function (letter, index){
	fonts[letter] = stylized[index];
});

function getStyledExt(ext: string): string{
	ext = ext.trim();

	var newExt = '';
	if(!ext){
		newExt = '📜';
	}else{
		for (var i = 0; i < ext.length; i++) {
			var char = ext.charAt(i).toLowerCase();
			if(typeof fonts[char] === 'undefined'){
				newExt = '📜';
				break;
			}
			var isLastIndex = i === ext.length -1;
			newExt += isLastIndex ? `${fonts[char]} ` : fonts[char];
		}
	}

	return newExt;
}

export default getStyledExt;