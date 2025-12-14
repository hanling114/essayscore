import os
print(os.getenv('OCR_API_KEY'))
data = [{'location': 
            {'top': 27, 'left': 91, 'width': 904, 'height': 47}, 
            'words': '的不可战胜!从2008年汶川地震再到2020年初'}, 
        {'location': 
            {'top': 96, 'left': 109, 'width': 885, 'height': 49}, 
            'words': '“新冠抗疫大战”,中国这个多难兴邦,用事'}, 
        {'location': 
            {'top': 167, 'left': 90, 'width': 927, 'height': 47}, 
            'words': '实向人们闻述了什么叫做越挫越勇,遇强则强!'}, 
        {'location': 
            {'top': 237, 'left': 90, 'width': 905, 'height': 47}, 
            'words': '我们伟大的民族文化精神总能适时焕发出强大'},
        {'location': 
            {'top': 308, 'left': 91, 'width': 903, 'height': 48}, 
            'words': '力量,每一个同胞在文化力量的感召下,团结'}, 
        {'location': 
            {'top': 378, 'left': 91, 'width': 901, 'height': 49}, 
            'words': '一致,自强不息,英勇斗争,一次次让中华民'}, 
        {'location': 
            {'top': 450, 'left': 88, 'width': 259, 'height': 45}, 
            'words': '族涅祭重生!'}, 
        {'location': 
            {'top': 519, 'left': 183, 'width': 834, 'height': 48},
            'words': '历史的车轮滚滚向前,如流水般从不停歇。'}, 
        {'location': 
            {'top': 589, 'left': 90, 'width': 903, 'height': 48}, 
            'words': '前人作古,我们也总有一天会变成历史。那么'}, 
        {'location': {'top': 660, 'left': 89, 'width': 904, 'height': 47}, 
            'words': '我们又能给后人留下什么呢?作为五千年历史'},
        {'location':
            {'top': 731, 'left': 89, 'width': 884, 'height': 48}, 
            'words': '的决决大国,创造出了博大精深的中华文化,'}, 
        {'location': 
            {'top': 800, 'left': 87, 'width': 909, 'height': 47}, 
            'words': '这深厚的文化底蕴,必会浸润一代又一代传承'}, 
        {'location': 
            {'top': 870, 'left': 88, 'width': 928, 'height': 50}, 
            'words': '者的血脉,勇往直前,推动人类文明不断向前,'}]

print(data["words_result"][0]['words'])

