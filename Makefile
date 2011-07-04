bespinFiles= Bespin/control.js Bespin/settings.json
bespin= Bespin/build/BespinMain.js # just one of the files should be enough to make this work

all: update $(bespin) run
deploy: update deploy-bespin

update:
	git submodule update --init --recursive

$(bespin): $(bespinFiles)
	cd Bespin/BespinEmbedded && ./dryice.py ../settings.json

deploy-bespin:
	cd Bespin/BespinEmbedded && ./dryice.py -j compressors/compiler.jar ../settings.json

run:
	node master.js


